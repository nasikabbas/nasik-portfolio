/**
 * Provenance gate for `data/profile.yaml`.
 *
 * Runs before `astro check` in `npm run check`, and in CI before the build. Four jobs:
 *
 *  1. **Parse.** A figure written without a source, a state the schema does not allow, or a
 *     `{token}` that names no figure fails here. `strictClaim` has no `assumed` branch, so an
 *     inferred number is unrepresentable rather than merely discouraged — this script is where
 *     that becomes an exit code.
 *  2. **Report every non-verified item by name** — figures that are `missing`, and statements
 *     that are `assumed` or `missing`. A gap listed on every run stays a work queue; a silent
 *     one ages into apparent fact. The list prints even when the run passes.
 *  3. **Report caveated figures.** Their limits must be rendered wherever the value appears;
 *     `scripts/check-dist.ts` verifies that on the built pages. Naming them here keeps the
 *     obligation visible to whoever edits the data.
 *  4. **Warn on numbers typed into prose.** A digit outside a `{token}` is usually a second copy
 *     of a fact that should be a figure. Warning, not failure: product names carry digits.
 *
 * Exit code is non-zero on any parse failure. Run it directly with `npx tsx`.
 */

import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import { parse } from 'yaml';

import { FIGURE_TOKEN, ProfileSchema, type Line } from '../src/schema/profile';

const PROFILE_PATH = resolvePath(process.cwd(), 'data/profile.yaml');

/**
 * Digits that are names, not quantities: methods and models whose names contain numbers.
 * Anything else with a digit outside a token is reported. Kept explicit so an addition is a
 * visible decision rather than a loosened pattern.
 */
const NAMES_WITH_DIGITS = [/\b5S\b/g, /\bo3\b/g, /\bo4-mini\b/g, /\bIsaac-1\b/g, /\b(19|20)\d{2}\b/g];

/** ANSI helpers. Degrade to plain text when stdout is not a TTY (CI logs, pipes). */
const useColour = process.stdout.isTTY === true;
const dim = (s: string): string => (useColour ? `\u001b[2m${s}\u001b[0m` : s);
const red = (s: string): string => (useColour ? `\u001b[31m${s}\u001b[0m` : s);
const yellow = (s: string): string => (useColour ? `\u001b[33m${s}\u001b[0m` : s);
const green = (s: string): string => (useColour ? `\u001b[32m${s}\u001b[0m` : s);

interface Finding {
  readonly where: string;
  readonly detail: string;
}

/** Every line in the profile, including `missing` ones, with a printable location. */
function allLines(profile: ReturnType<typeof ProfileSchema.parse>): Array<{ where: string; line: Line }> {
  const out: Array<{ where: string; line: Line }> = [];
  profile.person.summary.plain.forEach((line, i) => out.push({ where: `person.summary.plain[${i}]`, line }));
  profile.person.summary.technical.forEach((line, i) => out.push({ where: `person.summary.technical[${i}]`, line }));
  profile.roles.forEach((role) => {
    out.push({ where: `${role.id}.about`, line: role.about });
    role.positions.forEach((pos) => {
      const at = `${role.id} / ${pos.org ?? pos.title}`;
      if (pos.about !== undefined) out.push({ where: `${at}.about`, line: pos.about });
      pos.plain.forEach((line, i) => out.push({ where: `${at}.plain[${i}]`, line }));
      pos.technical.forEach((line, i) => out.push({ where: `${at}.technical[${i}]`, line }));
    });
  });
  return out;
}

const oneLine = (s: string): string => s.replace(/\s+/g, ' ').trim();

function main(): void {
  let raw: string;
  try {
    raw = readFileSync(PROFILE_PATH, 'utf8');
  } catch {
    console.error(red(`check-profile: cannot read ${PROFILE_PATH}`));
    process.exit(1);
  }

  const parsed = ProfileSchema.safeParse(parse(raw));

  if (!parsed.success) {
    console.error(red('check-profile: data/profile.yaml failed validation.\n'));
    for (const issue of parsed.error.issues) {
      const where = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      console.error(`  ${red('x')} ${where}: ${issue.message}`);
    }
    console.error(
      dim(
        '\n  A figure has no `assumed` state by design. If a number is not confirmed,\n' +
          '  write `state: missing` with a basis explaining what would confirm it.\n',
      ),
    );
    process.exit(1);
  }

  const profile = parsed.data;
  const unverified: Finding[] = [];
  const caveated: Finding[] = [];
  const typedNumbers: Finding[] = [];

  for (const [id, entry] of Object.entries(profile.figures)) {
    if (entry.figure.state !== 'verified') {
      unverified.push({ where: `figures.${id}`, detail: entry.figure.basis ?? 'no basis recorded' });
    } else if (entry.figure.caveat !== undefined) {
      caveated.push({ where: `figures.${id} = ${entry.figure.value}`, detail: entry.figure.caveat });
    }
  }

  for (const { where, line } of allLines(profile)) {
    if (typeof line !== 'string' && line.state !== 'verified') {
      unverified.push({ where: `${where} (${line.state})`, detail: line.basis ?? 'no basis recorded' });
    }
    const text = typeof line === 'string' ? line : line.state === 'missing' ? '' : line.value;
    let stripped = text.replace(FIGURE_TOKEN, '');
    for (const name of NAMES_WITH_DIGITS) stripped = stripped.replace(name, '');
    if (/\d/.test(stripped)) typedNumbers.push({ where, detail: oneLine(text) });
  }

  const figureCount = Object.keys(profile.figures).length;
  console.log(
    green(`check-profile: ${figureCount} figures, ${profile.roles.length} roles and ${allLines(profile).length} lines parsed.`),
  );

  if (caveated.length > 0) {
    console.log(
      `\n${yellow('Caveated figures')} — the limit MUST render wherever the value appears.\n` +
        'check-dist verifies this on the built pages; a bare value is a correctness bug.\n',
    );
    for (const f of caveated) {
      console.log(`  ${yellow('!')} ${f.where}`);
      console.log(`    ${dim(oneLine(f.detail))}`);
    }
  }

  if (typedNumbers.length > 0) {
    console.log(`\n${yellow('Numbers typed into prose')} — make each one a figure, or add a name to NAMES_WITH_DIGITS.\n`);
    for (const f of typedNumbers) {
      console.log(`  ${yellow('#')} ${f.where}`);
      console.log(`    ${dim(f.detail)}`);
    }
  }

  if (unverified.length > 0) {
    console.log(`\n${yellow('Not yet verified')} — visible on every run until closed.\n`);
    for (const f of unverified) {
      console.log(`  ${yellow('?')} ${f.where}`);
      console.log(`    ${dim(oneLine(f.detail))}`);
    }
  } else {
    console.log(dim('\nAll figures and statements verified.'));
  }

  console.log('');
}

main();
