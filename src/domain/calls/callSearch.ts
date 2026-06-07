/**
 * The call-page search button lives in the shared site nav (its own island),
 * while the search modal lives in the CallPage island. They coordinate through a
 * window event instead of shared React state.
 */
const CALL_SEARCH_EVENT = 'forkcast:open-call-search';

export function openCallSearch(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CALL_SEARCH_EVENT));
  }
}

export function onOpenCallSearch(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CALL_SEARCH_EVENT, handler);
  return () => window.removeEventListener(CALL_SEARCH_EVENT, handler);
}
