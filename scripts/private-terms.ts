/**
 * Matching private terms without publishing them.
 *
 * ## The problem this solves
 *
 * Some terms must never appear on the site — a private client's name, for example. The obvious
 * guard, a deny-list in `check-dist.ts`, is itself a disclosure: this repository is public, so a
 * list of what the site hides tells every reader exactly what is being hidden. The first version of
 * the guard did precisely that, and was caught before it was committed. The same reasoning keeps
 * categories, order and the plaintext's location out of this repository.
 *
 * So the public repository holds only **salted SHA-256 hashes** (`scripts/private-terms.json`). The
 * plaintext lives in the private working area and is hashed by `scripts/hash-terms.ts`. The check
 * hashes every word run on a built page and compares — it can tell that a term is present without
 * the repository ever saying what the term is.
 *
 * ## What it does not protect against
 *
 * Someone who already suspects a name can hash it and look it up; a salt defeats precomputed tables,
 * not a targeted guess. The threat addressed is the casual reader of a public repository, which is
 * the one that would otherwise be served the whole list in plain text.
 */

import { createHash } from 'node:crypto';

/** Public salt: prevents lookup in precomputed tables. It is not a secret and need not be. */
const SALT = 'nasikabbas.com/private-terms/v1';

/**
 * One hashed term: a run of `words` normalised words, or a run of `digits` digits.
 *
 * Deliberately carries **no category**: a public label such as "medical" or "availability" would
 * disclose, by itself, the kind of thing being hidden. A readable explanation of a match comes from
 * the private plaintext list, when it is present locally ({@link loadPlaintext}).
 */
export interface HashedTerm {
  readonly hash: string;
  /** Number of normalised words in the term, for word-run matching. */
  readonly words?: number;
  /** Number of digits, for digit-run matching (phone numbers, however they are written). */
  readonly digits?: number;
}

export interface TermsFile {
  readonly version: 1;
  readonly terms: HashedTerm[];
}

/**
 * Normalise text to lowercase words: accents removed, anything that is not a letter or digit is a
 * separator. Case and punctuation therefore cannot defeat a match — the failure that let a
 * capitalised client name through the first, pattern-based version of this guard.
 */
export function words(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w !== '');
}

/** Salted SHA-256 of a normalised term. */
export function hashTerm(normalised: string): string {
  return createHash('sha256').update(`${SALT}\u0000${normalised}`).digest('hex');
}

/** Parse the private plaintext list: `<category> | <term>` lines, `#` comments. */
export function parsePlaintext(source: string): Array<{ category: string; term: string; line: number }> {
  const out: Array<{ category: string; term: string; line: number }> = [];
  for (const [n, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const [category, term] = line.split('|').map((s) => s.trim());
    if (category === undefined || category === '' || term === undefined || term === '') {
      throw new Error(`private terms, line ${n + 1}: expected "<category> | <term>"`);
    }
    out.push({ category, term, line: n + 1 });
  }
  return out;
}

/** Hash one plaintext term the way {@link findTerms} will look for it. */
export function toHashed(term: string): HashedTerm {
  const digitsOnly = term.replace(/[\s\-+().]/g, '');
  if (/^\d+$/.test(digitsOnly)) return { hash: hashTerm(digitsOnly), digits: digitsOnly.length };
  const normalised = words(term);
  return { hash: hashTerm(normalised.join(' ')), words: normalised.length };
}

/**
 * Map hash → "category | term" from the private list, for readable local messages. Returns an
 * empty map when the list is not available (CI, a fresh clone) — matching never depends on it.
 */
export function loadPlaintext(source: string | undefined): Map<string, string> {
  if (source === undefined) return new Map();
  return new Map(parsePlaintext(source).map(({ category, term }) => [toHashed(term).hash, `${category} | ${term}`]));
}

/**
 * Every private term present in `text`, by hash, with the index of its first match. Word terms
 * match any run of the same length; digit terms match any window of the page's digits.
 */
export function findTerms(text: string, file: TermsFile): Array<{ hash: string; at: number }> {
  const byHash = new Map(file.terms.map((t) => [t.hash, t]));
  const found = new Map<string, { hash: string; at: number }>();

  const tokens = words(text);
  const lengths = [...new Set(file.terms.flatMap((t) => (t.words === undefined ? [] : [t.words])))];
  for (const n of lengths) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const hash = hashTerm(tokens.slice(i, i + n).join(' '));
      if (byHash.get(hash)?.words === n && !found.has(hash)) found.set(hash, { hash, at: i });
    }
  }

  const digits = text.replace(/\D+/g, '');
  const digitLengths = [...new Set(file.terms.flatMap((t) => (t.digits === undefined ? [] : [t.digits])))];
  for (const n of digitLengths) {
    for (let i = 0; i + n <= digits.length; i++) {
      const hash = hashTerm(digits.slice(i, i + n));
      if (byHash.get(hash)?.digits === n && !found.has(hash)) found.set(hash, { hash, at: i });
    }
  }
  return [...found.values()];
}
