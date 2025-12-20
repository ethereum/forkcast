import { useCallback } from 'react';

declare global {
  interface Window {
    _paq: unknown[][];
  }
}

export const useAnalytics = () => {
  const trackEvent = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window._paq) {
      // Matomo custom event tracking
      window._paq.push(['trackEvent', 'Custom', eventName, JSON.stringify(properties)]);
    }
  }, []);

  const trackPageView = useCallback((pageName?: string, pageTitle?: string, previousUrl?: string) => {
    if (typeof window !== 'undefined' && window._paq) {
      // For SPA tracking, we need to set custom URL and document title
      const customUrl = pageName || window.location.pathname;
      const customTitle = pageTitle || document.title;

      // Set the referrer URL if provided (for SPA navigation)
      if (previousUrl) {
        window._paq.push(['setReferrerUrl', previousUrl]);
      }

      // Set the custom URL and document title for the new page view
      window._paq.push(['setCustomUrl', customUrl]);
      window._paq.push(['setDocumentTitle', customTitle]);

      // Reset any previously set custom variables/dimensions for the new page
      window._paq.push(['deleteCustomVariables', 'page']);

      // Track the page view
      window._paq.push(['trackPageView']);

      // Make Matomo aware of newly added content for SPA
      window._paq.push(['enableLinkTracking']);
    }
  }, []);

  const trackUpgradeView = useCallback((upgradeName: string) => {
    if (typeof window !== 'undefined' && window._paq) {
      // Track upgrade view as a custom event
      window._paq.push(['trackEvent', 'Network Upgrade', 'View', upgradeName]);
    }
  }, []);

  const trackLinkClick = useCallback((linkType: string, linkUrl: string) => {
    if (typeof window !== 'undefined' && window._paq) {
      // Track link clicks as custom events
      window._paq.push(['trackEvent', 'External Link', linkType, linkUrl]);
    }
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackUpgradeView,
    trackLinkClick,
  };
};