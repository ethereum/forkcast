/** Strip a trailing slash so route comparisons treat "/foo" and "/foo/" as identical. */
export const normalizePathname = (pathname: string): string =>
  pathname.replace(/\/$/, '') || '/';

/**
 * The canonical form of an internal href. The site is configured `trailingSlash: 'always'`,
 * so a slash-less path resolves via a 301 rather than directly, and the dev server rejects
 * it outright. Route constants stay slash-less for comparison against `normalizePathname`;
 * this applies the slash at render.
 *
 * Passed through untouched: anything not root-relative (external URLs, `mailto:`, and the
 * bare `?query`/`#hash` forms used for in-place updates), and any path whose last segment
 * carries an extension — that names a file (`/feed.xml`, the raw `/eips/{id}.md` specs),
 * not a route.
 */
export const canonicalHref = (href: string): string => {
  if (!href.startsWith('/')) return href;
  const boundary = href.search(/[?#]/);
  const path = boundary === -1 ? href : href.slice(0, boundary);
  const rest = boundary === -1 ? '' : href.slice(boundary);
  const slash = path.endsWith('/') || /\.[^/]+$/.test(path) ? '' : '/';
  return `${path}${slash}${rest}`;
};

/** True when the current pathname is `to` or a descendant of it. The root `/` only matches itself. */
export const isPathActive = (pathname: string, to: string): boolean => {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
};
