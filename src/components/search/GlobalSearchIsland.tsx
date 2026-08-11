/**
 * Mounted on every page, so its import graph *is* the per-page cost of global
 * search: react + the bridge, nothing else. The modal, the search domain and all
 * the data it touches live behind `React.lazy`, and nothing renders until the
 * user actually opens search.
 */
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  consumePendingGlobalSearch,
  onOpenGlobalSearch,
  type GlobalSearchRequest,
} from '../../domain/search/globalSearchBridge';

const GlobalSearchModal = lazy(() => import('./GlobalSearchModal'));

/** Warms the modal chunk and the light corpus while the user is still typing ⌘K. */
let prefetched = false;
function prefetch(): void {
  if (prefetched) return;
  prefetched = true;
  void import('./GlobalSearchModal');
  void import('../../domain/search/lightCorpus').then((module) => module.loadLightCorpus().catch(() => {}));
}

export default function GlobalSearchIsland() {
  const [request, setRequest] = useState<GlobalSearchRequest | null>(null);
  // Latched so a reopen skips the lazy boundary entirely.
  const everOpened = useRef(false);

  const open = useCallback((detail: GlobalSearchRequest) => {
    everOpened.current = true;
    setRequest(detail);
  }, []);

  useEffect(() => {
    const unsubscribe = onOpenGlobalSearch(open);
    // SiteNav's inline script can fire before this island hydrates.
    const pending = consumePendingGlobalSearch();
    if (pending) open(pending);
    return unsubscribe;
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Meta' || event.key === 'Control') prefetch();
    };
    const onPointerEnter = () => prefetch();

    window.addEventListener('keydown', onKeyDown);
    const button = document.querySelector('[data-global-search]');
    button?.addEventListener('pointerenter', onPointerEnter);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      button?.removeEventListener('pointerenter', onPointerEnter);
    };
  }, []);

  if (!everOpened.current) return null;

  return (
    <Suspense fallback={null}>
      <GlobalSearchModal
        isOpen={request !== null}
        initialScope={request?.scope}
        initialQuery={request?.query}
        onClose={() => setRequest(null)}
      />
    </Suspense>
  );
}
