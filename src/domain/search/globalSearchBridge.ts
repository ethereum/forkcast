/**
 * The nav's search button and the ⌘K listener live in SiteNav's inline script,
 * which runs at parse time. The modal lives in a `client:idle` React island that
 * can hydrate tens of milliseconds later. `window` is the only channel the two
 * share, so a request is both dispatched as an event (for an already-mounted
 * island) and stashed (for one that hasn't mounted yet, which drains it on mount).
 */
import type { SearchScope } from './types';

export interface GlobalSearchRequest {
  scope?: SearchScope;
  query?: string;
}

const OPEN_EVENT = 'forkcast:open-global-search';
const PENDING_KEY = '__forkcastPendingGlobalSearch';

type BridgeWindow = Window & { [PENDING_KEY]?: GlobalSearchRequest };

export function openGlobalSearch(detail: GlobalSearchRequest = {}): void {
  if (typeof window === 'undefined') return;
  (window as BridgeWindow)[PENDING_KEY] = detail;
  window.dispatchEvent(new CustomEvent<GlobalSearchRequest>(OPEN_EVENT, { detail }));
}

export function onOpenGlobalSearch(handler: (detail: GlobalSearchRequest) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    delete (window as BridgeWindow)[PENDING_KEY];
    handler((event as CustomEvent<GlobalSearchRequest>).detail ?? {});
  };
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}

/** Drains a request made before the island mounted. Returns null if there was none. */
export function consumePendingGlobalSearch(): GlobalSearchRequest | null {
  if (typeof window === 'undefined') return null;
  const pending = (window as BridgeWindow)[PENDING_KEY];
  if (!pending) return null;
  delete (window as BridgeWindow)[PENDING_KEY];
  return pending;
}
