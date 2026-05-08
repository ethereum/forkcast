/** Strip a trailing slash so route comparisons treat "/foo" and "/foo/" as identical. */
export const normalizePathname = (pathname: string): string =>
  pathname.replace(/\/$/, '') || '/';

/** True when the current pathname is `to` or a descendant of it. The root `/` only matches itself. */
export const isPathActive = (pathname: string, to: string): boolean => {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
};
