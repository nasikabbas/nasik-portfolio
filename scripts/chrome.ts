/**
 * Where to find a Chromium browser, for the development tools that render pages: `shots.ts` and
 * `og-card.ts`. Neither runs in CI. Both are local tools, which is why the deploy runner needs no
 * browser.
 */

import { existsSync } from 'node:fs';

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

/** The first installed Chrome or Edge. Throws, naming the fix, when there is none. */
export function findChrome(): string {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (found === undefined) throw new Error('No Chrome or Edge found; add its path to CANDIDATES in scripts/chrome.ts.');
  return found;
}
