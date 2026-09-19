/**
 * Provenance gate for `data/profile.yaml`.
 *
 * Runs before `astro check` in `npm run check`, and in CI before the build. Three jobs:
 *
 *  1. **Parse.** A figure written without a source, or with a state the schema does not
 *     allow, fails here. `strictClaim` has no `assumed` branch, so an inferred number is
 *     unrepresentable rather than merely discouraged — this script is where that becomes
 *     an exit code.
 *  2. **Report every non-verified field by name.** A gap that is listed on every run stays
 *     a work queue; a gap that is silent ages into apparent fact. The list is the point,
 *     so it prints even when the run passes.
 *  3. **Report caveated figures.** A caveat is a limit that must be rendered wherever the
 *     value appears. Naming them here means the renderer's obligation is visible to whoever
 *     writes the renderer, rather than living in someone's memory.
 *
 * Exit code is non-zero on any parse failure. Run it directly with `npx tsx`.
 */

import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import { parse } from 'yaml';

import { ProfileSchema } from '../src/schema/profile';

const PROFILE_PATH = resolvePath(process.cwd(), 'data/profile.yaml');

/** ANSI helpers. Degrade to plain text when stdout is not a TTY (CI logs, pipes). */
const useColour = process.stdout.isTTY === true;
const dim = (s: string): string => (useColour ? `[2m${s}[0m` : s);
const red = (s: string): string => (useColour ? `[31m${s}[0m` : s);
const yellow = (s: string): string => (useColour ? `[33m${s}[0m` : s);
const green = (s: string): string => (useColour ? `[32m${s}[0m` : s);

interface Finding {
  readonly where: string;
  readonly detail: string;
}

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

  profile.evidence.forEach((point, index) => {
    const at = `evidence[${index}] "${point.label}"`;

    if (point.figure.state !== 'verified') {
      unverified.push({
        where: `${at}.figure`,
        detail: point.figure.basis ?? 'no basis recorded',
      });
    } else if (typeof point.figure.caveat === 'string') {
      caveated.push({ where: at, detail: point.figure.caveat });
    }

    if (point.note !== undefined && point.note.state !== 'verified') {
      unverified.push({
        where: `${at}.note`,
        detail: point.note.basis ?? 'no basis recorded',
      });
    }
  });

  console.log(green(`check-profile: ${profile.evidence.length} evidence points parsed.`));

  if (caveated.length > 0) {
    console.log(
      `\n${yellow('Caveated figures')} — the renderer MUST display these limits wherever the\n` +
        'value appears. A number shown bare here is a correctness bug, not a style choice.\n',
    );
    for (const f of caveated) {
      console.log(`  ${yellow('!')} ${f.where}`);
      console.log(`    ${dim(f.detail.replace(/\s+/g, ' ').trim())}`);
    }
  }

  if (unverified.length > 0) {
    console.log(`\n${yellow('Not yet verified')} — visible on every run until closed.\n`);
    for (const f of unverified) {
      console.log(`  ${yellow('?')} ${f.where}`);
      console.log(`    ${dim(f.detail.replace(/\s+/g, ' ').trim())}`);
    }
  } else {
    console.log(dim('\nAll figures verified.'));
  }

  console.log('');
}

main();
