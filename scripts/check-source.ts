/**
 * Private-term check over the repository's own files.
 *
 * `check-dist` guards what a reader of the site sees. This guards what a reader of the *repository*
 * sees — and the repository is public too. The near-miss that motivated it was not a page: it was a
 * plaintext deny-list in a script, and an example in this project's CLAUDE.md, both one commit away
 * from publishing the very names they existed to hide. Nothing checked source files, because the
 * build only looks at `dist/`.
 *
 * Runs in `npm run check` (so CI runs it on every push), over every tracked or new file that git
 * would commit. Same hashed matcher, same rule for logs: in CI a failure names the file, never the
 * term.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { findTerms, loadPlaintext, type TermsFile } from './private-terms';

const TERMS_PATH = join(process.cwd(), 'scripts', 'private-terms.json');
const IN_CI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

/** Files that legitimately hold hashes or binary data rather than prose. */
const SKIP = [/^scripts\/private-terms\.json$/, /\.(png|jpe?g|gif|ico|woff2?|pdf)$/i, /^package-lock\.json$/];

function main(): void {
  if (!existsSync(TERMS_PATH)) {
    console.error('check-source: scripts/private-terms.json is missing — regenerate it with scripts/hash-terms.ts.');
    process.exit(1);
  }
  const terms = JSON.parse(readFileSync(TERMS_PATH, 'utf8')) as TermsFile;
  if (terms.terms.length === 0) {
    console.error('check-source: no private terms loaded — the check would see nothing.');
    process.exit(1);
  }
  const plaintextPath = process.env.PRIVATE_TERMS_FILE;
  const explain =
    !IN_CI && plaintextPath !== undefined && existsSync(plaintextPath)
      ? loadPlaintext(readFileSync(plaintextPath, 'utf8'))
      : new Map<string, string>();

  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f !== '' && !SKIP.some((re) => re.test(f)));

  const failures: string[] = [];
  for (const file of files) {
    if (!existsSync(file)) continue; // deleted in the working tree, still in the index
    const content = readFileSync(file, 'utf8');
    for (const { hash } of findTerms(content, terms)) {
      const label = IN_CI ? 'a private term' : (explain.get(hash) ?? `a private term (${hash.slice(0, 8)})`);
      failures.push(`${file}: ${label}`);
    }
  }

  if (failures.length > 0) {
    console.error(`check-source: ${failures.length} private term(s) in files git would commit:`);
    for (const f of failures) console.error(`  x ${f}`);
    process.exit(1);
  }
  console.log(`check-source: ${files.length} files checked against ${terms.terms.length} private terms — clean.`);
}

main();
