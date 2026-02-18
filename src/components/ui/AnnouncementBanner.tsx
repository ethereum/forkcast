import { useState, useEffect } from 'react';

interface BannerLink {
  url: string;
  label: string;
  primary?: boolean;
}

interface AnnouncementBannerProps {
  storageKey: string;
  title: string;
  links: BannerLink[];
}

export default function AnnouncementBanner({
  storageKey,
  title,
  links,
}: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(storageKey) === 'true';
    setIsVisible(!isDismissed);
  }, [storageKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-purple-50 dark:bg-slate-800 border-b border-purple-200 dark:border-purple-700">
      <div className="max-w-4xl mx-auto py-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {title}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {links.map((link) =>
              link.primary ? (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-md px-3 py-1.5 transition-colors"
                >
                  {link.label}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                >
                  {link.label}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )
            )}
            <button
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-purple-200/60 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              aria-label="Dismiss banner"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
