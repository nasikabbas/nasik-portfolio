/**
 * Consumer-side gate: checks the BUILT site in `dist/`.
 *
 * A green build says files were produced, not that a reader gets a correct page. This repo's
 * standard is to verify at the consumer, so every promise the site makes is checked on the HTML
 * a reader actually receives. Runs as the last step of `npm run build`, which is what the deploy
 * workflow runs — so a page that breaks a rule is never published, even though CI and deploy
 * start independently on each push.
 *
 * Checks, each a failure (exit 1):
 *
 *  1. **Privacy.** No private term — matched against salted hashes (`scripts/private-terms.ts`), so
 *     this public repository never says what the terms are. Checked across the whole of every
 *     emitted text file, visible text and attributes alike.
 *  2. **Caveats render.** Wherever a caveated figure's value appears on a page, its limit appears
 *     on that page too. This is the check `claim.ts` has always promised and nothing performed.
 *  3. **Plain pages stay plain.** Outside `/technical/`, technical vocabulary is rejected and a
 *     reading-ease floor is enforced.
 *  4. **Structure.** One `h1`, a title, a description, a canonical URL and a language per page;
 *     every internal link and fragment resolves.
 *
 * Long sentences on plain pages are reported as warnings: they are the first thing to shorten.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { parse } from 'yaml';

import { ProfileSchema } from '../src/schema/profile';

import { findTerms, hashTerm, loadPlaintext, words, type TermsFile } from './private-terms';

/**
 * The folder to check. `dist/` by default; `DIST_DIR` points it at any other copy of the site —
 * `check-live.ts` uses it to run these same gates over the pages the live domain actually serves.
 */
const DIST = process.env.DIST_DIR ?? join(process.cwd(), 'dist');

const TERMS_PATH = join(process.cwd(), 'scripts', 'private-terms.json');

/**
 * GitHub Actions logs of a public repository are public, so a failure there must never print the
 * term it found — only that one was found, and on which page.
 */
const IN_CI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

/**
 * Load the hashed private terms. A missing or empty file fails the run: a privacy check with
 * nothing to look for passes every page, which is the most dangerous way for it to be wrong.
 */
function loadTerms(): TermsFile {
  if (!existsSync(TERMS_PATH)) {
    console.error('check-dist: scripts/private-terms.json is missing — regenerate it with scripts/hash-terms.ts.');
    process.exit(1);
  }
  const file = JSON.parse(readFileSync(TERMS_PATH, 'utf8')) as TermsFile;
  if (file.version !== 1 || !Array.isArray(file.terms) || file.terms.length === 0) {
    console.error('check-dist: scripts/private-terms.json is empty or unreadable — the privacy check would see nothing.');
    process.exit(1);
  }
  return file;
}

/**
 * The matcher tests itself on every run against synthetic terms, so a change to normalisation or
 * hashing cannot quietly blind it. The pattern-based first version of this guard shipped client
 * names without a case-insensitive flag and passed them through; only a deliberate injection
 * noticed. Case, punctuation and spacing must not defeat a match, and a partial or reordered
 * phrase must not produce one.
 */
function selfTest(): void {
  const probe: TermsFile = {
    version: 1,
    terms: [
      { hash: hashTerm(words('zeta probe phrase').join(' ')), words: 3 },
      { hash: hashTerm('5550123456'), digits: 10 },
    ],
  };
  const mustMatch = ['… Zeta   PROBE, phrase!', 'call +1 (555) 012-3456 today'];
  const mustNot = ['zeta phrase probe', 'zeta probe', 'call 555 012 345'];
  const blind = mustMatch.filter((s) => findTerms(s, probe).length === 0);
  const trigger = mustNot.filter((s) => findTerms(s, probe).length > 0);
  if (blind.length > 0 || trigger.length > 0) {
    console.error('check-dist: the private-term matcher failed its self-test:');
    for (const s of blind) console.error(`  x did not match: "${s}"`);
    for (const s of trigger) console.error(`  x matched when it must not: "${s}"`);
    process.exit(1);
  }
}

/** Technical vocabulary that has no place in the plain register (ADR 002). */
const JARGON: ReadonlyArray<RegExp> = [
  /\bLLMs?\b/,
  /langgraph|stategraph|fastmcp|\bMCP\b|\bRAG\b|faiss|embedding|vector/i,
  // Not "pipeline": the plain register uses it for gas pipelines (Trillium), and the software
  // sense never appears there. A rule that fires on the ordinary English word measures nothing.
  /\bSQL\b|\bAPIs?\b|schema|orchestrat|microservice|kubernetes|\bEKS\b|nestjs/i,
  /\btokens?\b|\bprompts?\b|\bagents?\b|tenancy|supervisor/i,
  /kappa|κ|cohen|mcnemar|\bp = /i,
  /\bTPM\b|\bTQM\b|\bSPSS\b|\bOKRs?\b|\bMVP\b|kanban|\b5S\b/,
];

/** Flesch reading ease below which a plain page fails. 50 is where "fairly difficult" begins. */
const PLAIN_READING_EASE_FLOOR = 50;
/** Sentences longer than this on plain pages are reported. */
const LONG_SENTENCE_WORDS = 30;

interface Failure {
  readonly check: string;
  readonly page: string;
  readonly detail: string;
}

const failures: Failure[] = [];
const warnings: Failure[] = [];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Site path of a built file: `dist/work/padelgpt/index.html` → `/work/padelgpt/`. */
function sitePath(file: string): string {
  const rel = relative(DIST, file).split(sep).join('/');
  return `/${rel.replace(/index\.html$/, '')}`;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

/** Visible text of an HTML fragment: scripts and styles removed, tags to spaces, entities decoded. */
function visibleText(html: string): string {
  return decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** Rough syllable count — adequate for a reading-ease trend, not for linguistics. */
function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

/**
 * Text blocks of an HTML fragment — one per paragraph, list item, heading or cell. Reading ease
 * is measured per block because a heading or a button label has no full stop: flattening the
 * page would glue each one onto the next sentence and report sentences nobody wrote.
 */
function textBlocks(html: string): string[] {
  const cleaned = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  const blocks: string[] = [];
  for (const m of cleaned.matchAll(/<(p|li|h[1-6]|dt|dd|td|th|figcaption|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = visibleText(m[2] ?? '');
    if (text !== '') blocks.push(text);
  }
  return blocks;
}

function readingEase(blocks: string[]): { score: number; long: string[] } {
  const sentences = blocks
    .flatMap((block) => block.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/))
    .map((s) => s.trim())
    .filter((s) => /[a-z]/i.test(s));
  const text = sentences.join(' ');
  const words = text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const score = 206.835 - 1.015 * (words.length / Math.max(1, sentences.length)) - 84.6 * (syl / Math.max(1, words.length));
  const long = sentences.filter((s) => (s.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length > LONG_SENTENCE_WORDS);
  return { score, long };
}

function main(): void {
  selfTest();
  if (!existsSync(DIST)) {
    console.error(`check-dist: ${DIST} does not exist — run \`astro build\` first, or check DIST_DIR.`);
    process.exit(1);
  }

  const profile = ProfileSchema.parse(parse(readFileSync(join(process.cwd(), 'data/profile.yaml'), 'utf8')));
  const caveated = Object.entries(profile.figures).flatMap(([id, e]) =>
    e.figure.state === 'verified' && e.figure.caveat !== undefined
      ? [{ id, value: norm(e.figure.value), caveat: norm(e.figure.caveat) }]
      : [],
  );

  const files = walk(DIST);
  const pages = files.filter((f) => f.endsWith('.html'));
  const textFiles = files.filter((f) => /\.(html|txt|xml|json|css|svg)$/.test(f));
  const pageById = new Map<string, string>(); // site path → html
  for (const f of pages) pageById.set(sitePath(f), readFileSync(f, 'utf8'));

  // 1. Privacy — every emitted text file, whole content (text and attributes alike). Locally, a
  // match is explained from the private plaintext list when PRIVATE_TERMS_FILE points at it; in CI
  // the message names only the page, because the log is public.
  const terms = loadTerms();
  const plaintextPath = process.env.PRIVATE_TERMS_FILE;
  const explain =
    !IN_CI && plaintextPath !== undefined && existsSync(plaintextPath)
      ? loadPlaintext(readFileSync(plaintextPath, 'utf8'))
      : new Map<string, string>();
  for (const file of textFiles) {
    const content = decode(readFileSync(file, 'utf8'));
    for (const { hash } of findTerms(content, terms)) {
      const label = IN_CI ? 'a private term' : (explain.get(hash) ?? `a private term (${hash.slice(0, 8)})`);
      failures.push({ check: 'privacy', page: sitePath(file), detail: `${label} is on this page.` });
    }
  }

  for (const [page, html] of pageById) {
    const text = visibleText(html);
    const main = /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? html;
    const mainText = visibleText(main);

    // 2. Caveats render wherever their value does.
    for (const fig of caveated) {
      if (text.includes(fig.value) && !text.includes(fig.caveat)) {
        failures.push({ check: 'caveat', page, detail: `"${fig.value}" (${fig.id}) appears without its limit.` });
      }
    }

    // 3. Plain pages stay plain.
    if (!page.startsWith('/technical/')) {
      for (const pattern of JARGON) {
        const m = pattern.exec(mainText);
        if (m !== null) {
          const at = Math.max(0, m.index - 50);
          failures.push({ check: 'plain-language', page, detail: `"${m[0]}" in: "…${mainText.slice(at, m.index + m[0].length + 50)}…"` });
        }
      }
      const { score, long } = readingEase(textBlocks(main));
      const verdict = `Flesch reading ease ${score.toFixed(1)} (floor ${PLAIN_READING_EASE_FLOOR})`;
      if (score < PLAIN_READING_EASE_FLOOR) failures.push({ check: 'reading-ease', page, detail: verdict });
      else console.log(`  reading ease  ${page.padEnd(24)} ${score.toFixed(1)}`);
      for (const s of long) warnings.push({ check: 'long-sentence', page, detail: s });
    }

    // 4. Structure.
    const h1s = html.match(/<h1[\s>]/gi)?.length ?? 0;
    if (h1s !== 1) failures.push({ check: 'structure', page, detail: `${h1s} <h1> elements; expected exactly one.` });
    if (!/<title>[^<]+<\/title>/i.test(html)) failures.push({ check: 'structure', page, detail: 'no <title>.' });
    if (!/<meta name="description" content="[^"]+"/i.test(html)) failures.push({ check: 'structure', page, detail: 'no meta description.' });
    if (!/<link rel="canonical" href="https:\/\/[^"]+"/i.test(html)) failures.push({ check: 'structure', page, detail: 'no absolute canonical URL.' });
    if (!/<html lang="[a-z-]+"/i.test(html)) failures.push({ check: 'structure', page, detail: 'no lang attribute.' });

    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (href === undefined || !href.startsWith('/') || href.startsWith('//')) continue;
      const [pathPart = '/', frag] = href.split('#');
      const targetPath = pathPart === '' ? page : pathPart;
      const targetHtml = pageById.get(targetPath.endsWith('/') ? targetPath : `${targetPath}/`);
      const isAsset = /\.[a-z0-9]+$/i.test(targetPath);
      if (isAsset) {
        if (!existsSync(join(DIST, targetPath))) failures.push({ check: 'links', page, detail: `missing asset ${href}` });
        continue;
      }
      if (targetHtml === undefined) {
        failures.push({ check: 'links', page, detail: `no page at ${href}` });
      } else if (frag !== undefined && frag !== '' && !targetHtml.includes(`id="${frag}"`)) {
        failures.push({ check: 'links', page, detail: `no #${frag} on ${targetPath}` });
      }
    }
  }

  console.log(`check-dist: ${pages.length} pages, ${textFiles.length} text files checked against ${terms.terms.length} private terms.`);

  if (warnings.length > 0) {
    console.log(`\nLong sentences on plain pages (over ${LONG_SENTENCE_WORDS} words) — shorten these first:`);
    for (const w of warnings) console.log(`  ~ ${w.page}  ${w.detail}`);
  }

  if (failures.length > 0) {
    console.error(`\ncheck-dist: ${failures.length} failure(s).`);
    for (const f of failures) console.error(`  x [${f.check}] ${f.page}  ${f.detail}`);
    process.exit(1);
  }
  console.log('\ncheck-dist: privacy, caveats, plain language, structure and links all pass.');
}

main();
