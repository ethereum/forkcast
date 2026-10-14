/* eslint-disable react-refresh/only-export-components -- provider + its hooks share one module */
import React, { Suspense, lazy, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * Opens the shared EIP drawer from anywhere beneath an `EipDrawerProvider`.
 *
 * EIP links appear in free text on several pages — decision summaries, call
 * transcripts, chat logs, mention lists — usually far from whatever renders
 * the drawer. A context keeps them from threading an opener through every
 * intermediate component, and leaves the link working as a plain link on
 * pages that host no drawer.
 */
const EipDrawerContext = React.createContext<((eipId: number) => void) | null>(null);

/**
 * The drawer pulls in `EipContent`, which is a ~108 KB chunk of its own. Most
 * visits never open it, so it loads on first use.
 */
const loadDrawer = () => import('./EipDrawer');
const LazyEipDrawer = lazy(async () => ({ default: (await loadDrawer()).EipDrawer }));

/**
 * Starts fetching the drawer chunk without opening it. Hover a link and the
 * chunk is usually there by the time the click lands.
 */
export const preloadEipDrawer = (): void => {
  void loadDrawer();
};

/** The opener, or null outside a provider — links fall back to navigating. */
export const useEipDrawer = (): ((eipId: number) => void) | null =>
  useContext(EipDrawerContext);

/**
 * Plain-click handler for an EIP link: open the drawer, leaving
 * modifier/middle-clicks to the anchor so cmd-click still opens a tab.
 * `stopPropagation` keeps the click off any clickable row around the link.
 *
 * Returns undefined when there is no opener, so a caller can spread the result
 * onto a link and get ordinary navigation instead.
 */
export const eipLinkClickHandler = (
  eipId: number,
  openEip: ((eipId: number) => void) | null,
): ((event: React.MouseEvent) => void) | undefined => {
  if (!openEip) return undefined;
  return (event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    openEip(eipId);
  };
};

/**
 * `eipLinkClickHandler` for one link. `enabled` is for EIPs the drawer can't
 * render — it has to stay a navigation.
 */
export const useOpenEipOnClick = (
  eipId: number,
  enabled = true,
): ((event: React.MouseEvent) => void) | undefined => {
  const openEip = useEipDrawer();
  return useMemo(
    () => eipLinkClickHandler(eipId, enabled ? openEip : null),
    [openEip, enabled, eipId],
  );
};

/**
 * Hosts one drawer for its whole subtree. Mount it once per page, around
 * everything that renders EIP links.
 */
export const EipDrawerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [eipId, setEipId] = useState<number | null>(null);
  // The drawer stays mounted after the first open so its exit animation can
  // run; before that it is absent, and its chunk stays unfetched.
  const opened = useRef(false);
  if (eipId != null) opened.current = true;

  const openEip = useCallback((id: number) => setEipId(id), []);
  const close = useCallback(() => setEipId(null), []);

  return (
    <EipDrawerContext.Provider value={openEip}>
      {children}
      {opened.current && (
        <Suspense fallback={null}>
          <LazyEipDrawer eipId={eipId} onClose={close} />
        </Suspense>
      )}
    </EipDrawerContext.Provider>
  );
};
