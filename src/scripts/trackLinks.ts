/**
 * Preserve the custom Matomo "External Link" events that used to fire from React
 * `useAnalytics().trackLinkClick` on static surfaces. Any `<a data-track-link="{type}">`
 * pushes `['trackEvent', 'External Link', type, href]` on click — matching `useAnalytics`.
 * Import once from a page that has tracked links: `<script>import '../scripts/trackLinks';</script>`.
 * `Window._paq` is declared globally by `hooks/useAnalytics.ts`.
 */
document.querySelectorAll<HTMLAnchorElement>('a[data-track-link]').forEach((anchor) => {
  anchor.addEventListener('click', () => {
    window._paq?.push(['trackEvent', 'External Link', anchor.dataset.trackLink, anchor.href]);
  });
});

export {};
