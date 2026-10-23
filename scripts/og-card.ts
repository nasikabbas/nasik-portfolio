/**
 * Render the share card: the image a link to the site shows on LinkedIn, Slack and the like.
 *
 * Usage: `npm run og-card` after changing his name, role, employer, focus or plain headline in
 * `data/profile.yaml`, or `SITE_URL`. Writes `public/og/card.png` (1200×630) and its stamp,
 * `data/og-card.json`; commit both. The card is rendered here and committed, rather than drawn by the
 * build, so the image that ships is the one that was looked at — a CI runner would draw it with its
 * own fonts, unseen. While the stamp disagrees with the profile, or the image with the stamp,
 * `check-dist` fails the build. A development tool: it is not run in CI.
 *
 * Chrome's `--window-size` is honest at this width; only below ~504 px does it render wider and crop
 * (see `shots.ts`). Chrome also exits 0 when it cannot write its screenshot, so the image is drawn to
 * a fresh temporary file that must exist afterwards, and the PNG's own header is checked before
 * anything is copied or stamped.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parse } from 'yaml';

import { cardText, SHARE_CARD } from '../src/lib/identity';
import type { CardStamp, CardText } from '../src/schema/card';
import { ProfileSchema } from '../src/schema/profile';
import { findChrome } from './chrome';
import { pngSize, sealOf } from './share-card';

/** Where the stamp lives: beside the profile it was drawn from, not served with the site. */
const STAMP_FILE = join(process.cwd(), 'data', 'og-card.json');

/** Escape text for HTML: profile text is data, and must never become markup. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * The card's markup. It uses the site's light-theme tokens and system font stack
 * (`public/styles/global.css`), so a shared link looks like the site it opens.
 */
function cardHtml(text: CardText): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: ${SHARE_CARD.width}px; height: ${SHARE_CARD.height}px; overflow: hidden; }
  body { background: #fbfaf6; color: #16161b; box-sizing: border-box; border-top: 14px solid #1b4d82;
         font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
         display: flex; flex-direction: column; justify-content: center; padding: 0 96px; }
  .name { font-size: 76px; font-weight: 700; letter-spacing: -0.02em; margin: 0; }
  .title { font-size: 40px; font-weight: 600; color: #1b4d82; margin: 18px 0 0; }
  .line { font-size: 32px; line-height: 1.35; color: #44444e; margin: 34px 0 0; max-width: 960px; }
  .site { position: absolute; bottom: 52px; left: 96px; font-size: 26px; color: #676773; margin: 0; }
</style></head><body>
  <p class="name">${escapeHtml(text.name)}</p>
  <p class="title">${escapeHtml(text.title)}</p>
  <p class="line">${escapeHtml(text.line)}</p>
  <p class="site">${escapeHtml(text.site)}</p>
</body></html>
`;
}

function main(): void {
  const profile = ProfileSchema.parse(parse(readFileSync(join(process.cwd(), 'data/profile.yaml'), 'utf8')));
  const text = cardText(profile.person);

  const work = mkdtempSync(join(tmpdir(), 'og-card-'));
  const page = join(work, 'card.html');
  const drawn = join(work, 'card.png');
  writeFileSync(page, cardHtml(text));
  const run = spawnSync(
    findChrome(),
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--user-data-dir=${join(work, 'profile')}`,
      `--window-size=${SHARE_CARD.width},${SHARE_CARD.height}`,
      `--screenshot=${drawn}`,
      pathToFileURL(page).href,
    ],
    { timeout: 60_000, encoding: 'utf8' },
  );
  if (run.status !== 0 || !existsSync(drawn)) {
    throw new Error(`Chrome did not draw the card (exit ${run.status}):\n${run.stderr}`);
  }

  const png = readFileSync(drawn);
  const size = pngSize(png);
  if (size === undefined) throw new Error('Chrome wrote a file that is not a PNG.');
  if (size[0] !== SHARE_CARD.width || size[1] !== SHARE_CARD.height) {
    throw new Error(`Chrome drew ${size[0]}×${size[1]}, not ${SHARE_CARD.width}×${SHARE_CARD.height}.`);
  }

  const out = join(process.cwd(), 'public', SHARE_CARD.path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  const stamp: CardStamp = { text, seal: sealOf(text, png) };
  writeFileSync(STAMP_FILE, `${JSON.stringify(stamp, null, 2)}\n`);
  console.log(`og-card: ${SHARE_CARD.path} (${size[0]}×${size[1]}), "${text.title}", sealed in data/og-card.json. Commit both.`);
}

main();
