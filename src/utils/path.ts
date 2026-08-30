/** Strip a trailing slash so route comparisons treat "/foo" and "/foo/" as identical. */
export const normalizePathname = (pathname: string): string =>
  pathname.replace(/\/$/, '') || '/';

/**
 * The canonical href for a route path. The site is configured `trailingSlash: 'always'`,
 * so a slash-less href resolves via a 301 rather than directly. Route constants stay
 * slash-less for comparison against `normalizePathname`; this applies the slash at render.
 */
export const canonicalHref = (to: string): string => (to.endsWith('/') ? to : `${to}/`);

/** True when the current pathname is `to` or a descendant of it. The root `/` only matches itself. */
export const isPathActive = (pathname: string, to: string): boolean => {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
};
