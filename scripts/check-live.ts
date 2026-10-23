/**
 * Verify the live site at the consumer: download what nasikabbas.com actually serves, then run the
 * same gates `check-dist` applies to the build.
 *
 * A green deploy workflow says an artifact was published, not that a reader gets a correct page.
 * The deploy procedure used to check that by hand with a few `curl | grep` lines — one of which
 * grepped for a CSS class the redesign removed, so it would have reported zero caveats on a correct
 * page. Running the real gates over the served HTML cannot drift from the build's rules, because it
 * is the build's rules.
 *
 * Usage: `npm run check:live` (after a deploy). Also checks that plain http:// redirects to https://.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { path, SITE_URL } from '../src/config/site';
import { SHARE_CARD } from '../src/lib/identity';

/**
 * A response kept as bytes, with `body` as its text. Bytes, because decoding an image as text
 * corrupts it, and `check-dist` hashes the served share card against its stamp.
 */
async function get(url: string): Promise<{ status: number; bytes: Buffer; body: string; headers: Headers }> {
  const res = await fetch(url, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });
  const bytes = Buffer.from(await res.arrayBuffer());
  return { status: res.status, bytes, body: bytes.toString('utf8'), headers: res.headers };
}

/** `https://nasikabbas.com/work/padelgpt/` → `<root>/work/padelgpt/index.html`. */
function localPath(root: string, url: string): string {
  const pathname = new URL(url).pathname;
  return pathname.endsWith('/') ? join(root, pathname, 'index.html') : join(root, pathname);
}

function save(root: string, url: string, bytes: Buffer): void {
  const file = localPath(root, url);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes);
}

async function main(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'nasik-live-'));
  const failures: string[] = [];

  // 1. Every page the sitemap lists, via the sitemap index.
  const index = await get(`${SITE_URL}/sitemap-index.xml`);
  if (index.status !== 200) throw new Error(`sitemap-index.xml returned ${index.status}`);
  save(root, `${SITE_URL}/sitemap-index.xml`, index.bytes);
  const pages: string[] = [];
  for (const [, sitemapUrl] of index.body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (sitemapUrl === undefined) continue;
    const sitemap = await get(sitemapUrl);
    save(root, sitemapUrl, sitemap.bytes);
    for (const [, pageUrl] of sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)) if (pageUrl !== undefined) pages.push(pageUrl);
  }
  if (pages.length === 0) throw new Error('the sitemap lists no pages');

  // 2. Each page, and every local asset it references. The share card is named by an absolute,
  // versioned og:image URL, which the href/src pattern misses, so it is fetched explicitly. Its stamp
  // is not served; check-dist reads the repository's copy and checks the served image against it.
  const assets = new Set<string>([path(SHARE_CARD.path)]);
  for (const url of pages) {
    const page = await get(url);
    if (page.status !== 200) failures.push(`${url} returned ${page.status}`);
    save(root, url, page.bytes);
    console.log(`  ${page.status}  ${url}  (last-modified ${page.headers.get('last-modified') ?? 'n/a'})`);
    for (const [, ref] of page.body.matchAll(/(?:href|src)="(\/[^"#?]+\.[a-z0-9]+)"/gi)) if (ref !== undefined) assets.add(ref);
  }
  for (const ref of assets) {
    const asset = await get(`${SITE_URL}${ref}`);
    if (asset.status !== 200) failures.push(`${ref} returned ${asset.status}`);
    save(root, `${SITE_URL}${ref}`, asset.bytes);
  }

  // 3. Plain http:// must redirect to https:// — a 200 means HTTPS enforcement was switched off.
  const plain = await fetch(SITE_URL.replace(/^https:/, 'http:'), { redirect: 'manual' });
  const location = plain.headers.get('location') ?? '';
  if (!(plain.status === 301 && location.startsWith('https://'))) {
    failures.push(`http:// returned ${plain.status} ${location} — expected 301 to https://`);
  } else {
    console.log(`  301  http:// → ${location}`);
  }

  // 4. The build's own gates, over the served copy. Node itself runs the script with tsx loaded,
  // rather than `npx` through a shell: a shell concatenates arguments unescaped (Node deprecates
  // exactly that), and `npx` alone does not resolve on Windows without one.
  const run = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/check-dist.ts'], {
    env: { ...process.env, DIST_DIR: root },
    stdio: 'inherit',
  });
  if (run.status !== 0) failures.push('check-dist failed on the live pages');

  if (failures.length > 0) {
    console.error(`\ncheck-live: ${failures.length} failure(s):`);
    for (const f of failures) console.error(`  x ${f}`);
    console.error('\nPages caches for about 10 minutes: if this ran right after a deploy, wait and re-check once.');
    process.exit(1);
  }
  console.log(`\ncheck-live: ${pages.length} pages and ${assets.size} assets served correctly, and pass every build gate.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
