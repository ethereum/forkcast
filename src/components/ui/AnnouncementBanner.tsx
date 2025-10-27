import { useState, useEffect } from "react";

interface AnnouncementBannerProps {
  /** Unique key for localStorage to track dismissal */
  storageKey: string;
  /** Main announcement text (mobile version) */
  title: string;
  /** Full announcement text (desktop version) */
  fullTitle?: string;
  /** Secondary text/badge content */
  badge?: string;
  /** External link URL */
  linkUrl?: string;
  /** Link text for desktop */
  linkText?: string;
  /** Link text for mobile */
  linkTextMobile?: string;
  /** Background gradient classes */
  gradientClasses?: string;
  /** Border color classes */
  borderClasses?: string;
  /** Show shield icon on desktop */
  showIcon?: boolean;
}

export default function AnnouncementBanner({
  storageKey,
  title,
  fullTitle,
  badge,
  linkUrl,
  linkText = "Learn More",
  linkTextMobile = "Info",
  gradientClasses = "bg-gradient-to-r from-cyan-600 via-lime-600 to-amber-600 dark:from-cyan-700 dark:via-lime-700 dark:to-amber-700",
  borderClasses = "border-lime-600",
  showIcon = true,
}: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the banner has been dismissed
    const isDismissed = localStorage.getItem(storageKey) === "true";
    setIsVisible(!isDismissed);
  }, [storageKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, "true");
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`${gradientClasses} text-white shadow-sm border-b ${borderClasses} relative z-50`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-0">
        <div className="flex items-center justify-between py-3 sm:py-4">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
            {showIcon && (
              <div className="flex-shrink-0 hidden sm:block">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                <span className="font-semibold text-sm sm:text-base">
                  <span className="sm:hidden">{title}</span>
                  <span className="hidden sm:inline">{fullTitle || title}</span>
                </span>
                {badge && (
                  <span className="text-xs bg-white/20 rounded px-2 py-1 mt-1 sm:mt-0 inline-block w-fit">
                    {badge}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-2 ml-2 sm:ml-4">
            {linkUrl && (
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs bg-white/20 hover:bg-white/30 transition-colors duration-200 rounded px-2 py-1"
              >
                <span className="hidden sm:inline">{linkText}</span>
                <span className="sm:hidden">{linkTextMobile}</span>
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
            <button
              onClick={handleDismiss}
              className="inline-flex items-center justify-center w-6 h-6 bg-white/20 hover:bg-white/30 transition-colors duration-200 rounded"
              aria-label="Dismiss banner"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
