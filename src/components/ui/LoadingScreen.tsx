interface LoadingScreenProps {
  message?: string;
  /** Optional subtitle or context (e.g. "Fetching transcript...") */
  subtitle?: string;
  /** Show skeleton lines below (good for call/page context) */
  skeleton?: boolean;
  className?: string;
}

export function LoadingScreen({
  message = 'Loading',
  subtitle,
  skeleton = false,
  className = '',
}: LoadingScreenProps) {
  return (
    <div
      className={`min-h-screen w-full min-w-full box-border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`${message}${subtitle ? ` – ${subtitle}` : ''}`}
    >
      <div
        className="flex flex-col items-center text-center max-w-sm animate-[loadingFadeInUp_0.5s_ease-out]"
        style={{ animationFillMode: 'both' }}
      >
        {/* Gradient ring spinner with soft glow */}
        <div className="relative mb-8 w-20 h-20 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full opacity-40 dark:opacity-30 blur-md"
            style={{
              background: 'conic-gradient(from 0deg, #6366f1, #8b5cf6, #a855f7, #6366f1)',
              animation: 'loadingGradientSpin 1.4s linear infinite',
            }}
          />
          <div
            className="relative w-16 h-16 rounded-full p-[3px]"
            style={{
              background: 'conic-gradient(from 0deg, #6366f1, #8b5cf6, #a855f7, #c084fc, #6366f1)',
              animation: 'loadingGradientSpin 1.2s linear infinite',
            }}
          >
            <div className="w-full h-full rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
              <img
                src="/forkcast-logo.svg"
                alt=""
                className="h-5 w-auto opacity-90 animate-[loadingPulse_2s_ease-in-out_infinite]"
                aria-hidden
              />
            </div>
          </div>
        </div>

        {/* Message with animated dots */}
        <p className="text-slate-600 dark:text-slate-400 font-medium text-sm mb-1">
          {message}
          <span className="inline-flex ml-0.5" aria-hidden>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 ml-0.5 animate-[loadingBounce_1.4s_ease-in-out_infinite]"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 ml-0.5 animate-[loadingBounce_1.4s_ease-in-out_infinite]"
              style={{ animationDelay: '160ms' }}
            />
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 ml-0.5 animate-[loadingBounce_1.4s_ease-in-out_infinite]"
              style={{ animationDelay: '320ms' }}
            />
          </span>
        </p>
        {subtitle && (
          <p className="text-slate-500 dark:text-slate-500 text-xs animate-[loadingFadeInUp_0.4s_ease-out_0.2s_both]">
            {subtitle}
          </p>
        )}

        {/* Optional skeleton lines */}
        {skeleton && (
          <div className="w-full mt-8 space-y-3 animate-[loadingFadeInUp_0.4s_ease-out_0.15s_both]">
            <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className="h-full w-full rounded animate-loading-shimmer" />
            </div>
            <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className="h-full w-full rounded animate-loading-shimmer" style={{ animationDelay: '0.15s' }} />
            </div>
            <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className="h-full w-full rounded animate-loading-shimmer" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
