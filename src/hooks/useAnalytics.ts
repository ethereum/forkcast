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
    trackUpgradeView,
    trackLinkClick,
  };
};