/* eslint-disable react-refresh/only-export-components -- navigation helpers (hooks + Link) intentionally share one module */
/**
 * Minimal browser-navigation helpers that replace the slice of `react-router-dom`
 * the app used, without bringing a client router into the Astro static site.
 *
 * Astro owns routing: every route is a real page. These helpers exist so React
 * islands can (a) render normal links, (b) read the current URL, and (c) update
 * query/hash state in place — without a full reload — for the deliberately
 * URL-but-not-route state the app keeps (filters, tabs, playback, search, …).
 *
 * Navigating to a different path performs a real browser navigation (a new Astro
 * page). Changing only the query/hash on the current path updates history in
 * place and notifies subscribers, preserving island state.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';
import { normalizePathname } from '../utils/path';

const LOCATION_EVENT = 'forkcast:locationchange';

export interface Path {
  pathname?: string;
  search?: string;
  hash?: string;
}

export type To = string | Path;

interface NavigateOptions {
  replace?: boolean;
}

const hasWindow = (): boolean => typeof window !== 'undefined';

const ensureLeading = (value: string, char: string): string =>
  !value || value.startsWith(char) ? value : `${char}${value}`;

/** Resolve a react-router-style `To` into an href string. */
export const toHref = (to: To): string => {
  if (typeof to === 'string') return to;
  const pathname = to.pathname ?? (hasWindow() ? window.location.pathname : '/');
  const search = to.search ? ensureLeading(to.search, '?') : '';
  const hash = to.hash ? ensureLeading(to.hash, '#') : '';
  return `${pathname}${search}${hash}`;
};

const notifyLocationChange = () => {
  window.dispatchEvent(new Event(LOCATION_EVENT));
};

/** Subscribe to back/forward and in-place history updates. */
const subscribe = (callback: () => void): (() => void) => {
  window.addEventListener('popstate', callback);
  window.addEventListener(LOCATION_EVENT, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(LOCATION_EVENT, callback);
  };
};

export interface Location {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
}

const readLocation = (): Location =>
  hasWindow()
    ? {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        state: window.history.state,
      }
    : { pathname: '/', search: '', hash: '', state: null };

export const useLocation = (): Location => {
  const [location, setLocation] = useState<Location>(readLocation);
  useEffect(() => subscribe(() => setLocation(readLocation())), []);
  return location;
};

/**
 * In-place update of the URL on the current path. Pushes (or replaces) a history
 * entry and notifies subscribers without reloading the page.
 */
const updateInPlace = (href: string, replace: boolean) => {
  if (replace) window.history.replaceState(null, '', href);
  else window.history.pushState(null, '', href);
  notifyLocationChange();
};

export const useNavigate = () =>
  useCallback((to: To, options: NavigateOptions = {}) => {
    if (!hasWindow()) return;
    const href = toHref(to);
    const target = new URL(href, window.location.origin);
    // Compare normalized paths so a trailing-slash directory URL (the GitHub Pages
    // canonical form, e.g. "/calls/") still counts as the same path as a no-slash
    // target ("/calls"); otherwise the in-place query/hash update degrades to a reload.
    const samePath =
      normalizePathname(target.pathname) === normalizePathname(window.location.pathname);

    if (samePath) {
      updateInPlace(href, Boolean(options.replace));
    } else if (options.replace) {
      window.location.replace(href);
    } else {
      window.location.assign(href);
    }
  }, []);

type SearchParamsInit =
  | URLSearchParams
  | string
  | Record<string, string>
  | ((prev: URLSearchParams) => URLSearchParams | string | Record<string, string>);

const toURLSearchParams = (
  init: URLSearchParams | string | Record<string, string>,
): URLSearchParams =>
  init instanceof URLSearchParams ? init : new URLSearchParams(init);

export const useSearchParams = (): [
  URLSearchParams,
  (init: SearchParamsInit, options?: NavigateOptions) => void,
] => {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const setSearchParams = useCallback(
    (init: SearchParamsInit, options: NavigateOptions = {}) => {
      if (!hasWindow()) return;
      const current = new URLSearchParams(window.location.search);
      const resolved = typeof init === 'function' ? init(current) : init;
      const next = toURLSearchParams(resolved);
      const query = next.toString();
      const href = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
      updateInPlace(href, Boolean(options.replace));
    },
    [],
  );

  return [params, setSearchParams];
};

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: To;
  children?: ReactNode;
}

/**
 * A plain anchor. Cross-page links become real Astro navigations; that is the
 * correct behavior for a static multi-page site.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, children, ...rest },
  ref,
) {
  return (
    <a ref={ref} href={toHref(to)} {...rest}>
      {children}
    </a>
  );
});
