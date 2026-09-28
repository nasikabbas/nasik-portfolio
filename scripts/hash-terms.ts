/**
 * Regenerate `scripts/private-terms.json` from the private plaintext list.
 *
 * Usage:
 *   npx tsx scripts/hash-terms.ts <path to the private plaintext list>
 *
 * The plaintext lives in the private working area and never enters this repository; only hashes and
 * lengths are written here — no categories, no order. See `scripts/private-terms.ts` for why, and for
 * what hashing does and does not protect against. Lines are `<category> | <term>`; `#` starts a
 * comment. A term made only of digits (spaces and punctuation ignored) becomes a digit-run term.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parsePlaintext, toHashed, type TermsFile } from './private-terms';

const source = process.argv[2];
if (source === undefined) {
  console.error('usage: npx tsx scripts/hash-terms.ts <path to the private plaintext list>');
  process.exit(1);
}

const terms = parsePlaintext(readFileSync(source, 'utf8')).map(({ term }) => toHashed(term));

// Sorted by hash so the file's order carries no information about the plaintext list.
terms.sort((a, b) => a.hash.localeCompare(b.hash));
const out: TermsFile = { version: 1, terms };
const target = join(process.cwd(), 'scripts', 'private-terms.json');
writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
console.log(`hash-terms: ${terms.length} terms hashed into scripts/private-terms.json.`);
