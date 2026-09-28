import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import { BASE_PATH, SITE_URL } from './src/config/site';

/**
 * Static-only build targeting GitHub Pages on a custom apex domain.
 *
 * `site` and `base` are read from `src/config/site.ts` rather than written here, so the
 * origin and sub-path have exactly one definition, shared with the runtime code that
 * builds canonical URLs and JSON-LD.
 */
export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  output: 'static',
  // Pages serves `/foo/index.html` for `/foo`, so directory format avoids a redirect hop.
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  // robots.txt advertises the sitemap; without this the reference points at nothing.
  // Print routes exist only as a source for generated PDFs. They carry noindex, but
  // keeping them out of the sitemap avoids advertising a duplicate of every page.
  integrations: [sitemap({ filter: (page) => !page.includes('/print/') })],
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
});
