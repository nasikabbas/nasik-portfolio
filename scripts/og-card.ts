/**
 * Render the share card: the image a link to the site shows on LinkedIn, Slack and the like.
 *
 * Usage: `npm run og-card` after changing his name, role, employer, focus or plain headline in
 * `data/profile.yaml`. Writes `public/og/card.png` (1200×630) and `public/og/card.json`, its stamp;
 * commit both. While the stamp disagrees with the profile, `check-dist` fails the build, so a card
 * with an old title cannot ship. A development tool: it needs Chrome, so it does not run in CI.
 *
 * Chrome's `--window-size` is honest at this width. It is only below ~504 px that it silently
 * renders wider and crops (see `shots.ts`). The PNG's own header is checked anyway, below.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parse } from 'yaml';

import { cardText, SHARE_CARD, type CardStamp, type CardText } from '../src/lib/identity';
import { ProfileSchema } from '../src/schema/profile';
import { findChrome } from './chrome';

const PUBLIC = join(process.cwd(), 'public');

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
  <p class="site">nasikabbas.com</p>
</body></html>
`;
}

/** Width and height from a PNG's IHDR chunk: proof the file is the size the platforms ask for. */
function pngSize(png: Buffer): [number, number] {
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

function main(): void {
  const profile = ProfileSchema.parse(parse(readFileSync(join(process.cwd(), 'data/profile.yaml'), 'utf8')));
  const text = cardText(profile.person);

  const work = mkdtempSync(join(tmpdir(), 'og-card-'));
  const page = join(work, 'card.html');
  writeFileSync(page, cardHtml(text));

  const out = join(PUBLIC, SHARE_CARD.path);
  mkdirSync(dirname(out), { recursive: true });
  const run = spawnSync(
    findChrome(),
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--user-data-dir=${join(work, 'profile')}`,
      `--window-size=${SHARE_CARD.width},${SHARE_CARD.height}`,
      `--screenshot=${out}`,
      pathToFileURL(page).href,
    ],
    { timeout: 60_000, encoding: 'utf8' },
  );
  if (run.status !== 0) throw new Error(`Chrome exited ${run.status}: ${run.stderr}`);

  const png = readFileSync(out);
  const [width, height] = pngSize(png);
  if (width !== SHARE_CARD.width || height !== SHARE_CARD.height) {
    throw new Error(`Chrome drew ${width}×${height}, not ${SHARE_CARD.width}×${SHARE_CARD.height}.`);
  }
  const stamp: CardStamp = { text, sha256: createHash('sha256').update(png).digest('hex') };
  writeFileSync(join(PUBLIC, SHARE_CARD.stamp), `${JSON.stringify(stamp, null, 2)}\n`);
  console.log(`og-card: ${SHARE_CARD.path} (${width}×${height}) — "${text.title}" — and its stamp. Commit both.`);
}

main();
