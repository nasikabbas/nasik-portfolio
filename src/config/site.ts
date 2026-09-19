/**
 * Deployment-shape constants.
 *
 * Everything that changes when this site moves — a different origin, or back onto a
 * Pages sub-path — lives here and nowhere else. Nothing in `src/` may hard-code the
 * origin or the base path; always go through {@link path} or {@link absoluteUrl}, so a
 * move stays a two-line edit rather than a hunt through templates.
 */

/** Origin the site is served from. No trailing slash. */
export const SITE_URL = 'https://nasikabbas.com';

/**
 * Sub-path the site is served under, with a leading and no trailing slash.
 * Empty when served from a domain root, which is the case here.
 *
 * The apex domain is not decoration. `robots.txt` is only ever read at a domain root, so
 * on a `user.github.io/project` sub-path the AI-crawler allowlist is inert — and being
 * retrievable when someone asks an assistant about this person is one of the reasons the
 * site exists. `public/CNAME` binds the domain; this constant must agree with it.
 */
export const BASE_PATH = '';

/**
 * Resolve a site-root-relative path to a href usable in markup.
 *
 * @param to - Path relative to the site root, e.g. `/work` or `/resume/cv.pdf`.
 * @returns The path prefixed with {@link BASE_PATH}.
 */
export function path(to: string): string {
  const normalized = to.startsWith('/') ? to : `/${to}`;
  return normalized === '/' ? `${BASE_PATH}/` : `${BASE_PATH}${normalized}`;
}

/**
 * Resolve a site-root-relative path to a fully-qualified URL.
 *
 * Required for canonical links, Open Graph tags, JSON-LD and sitemaps — relative paths
 * are not valid in any of those, and crawlers silently mis-resolve them rather than
 * erroring, so the mistake is invisible from the authoring side.
 *
 * @param to - Path relative to the site root, e.g. `/llms.txt`.
 * @returns Absolute URL, e.g. `https://nasikabbas.com/llms.txt`.
 */
export function absoluteUrl(to: string): string {
  return `${SITE_URL}${path(to)}`;
}
