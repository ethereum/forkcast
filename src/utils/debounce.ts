/**
 * Creates a debounced version of a function that delays invoking the function
 * until after `delay` milliseconds have elapsed since the last time it was invoked.
 *
 * @param func The function to debounce
 * @param delay The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<Args extends unknown[], R>(
  func: (...args: Args) => R,
  delay: number
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Creates a throttled version of a function that only invokes the function
 * at most once per every `limit` milliseconds.
 *
 * @param func The function to throttle
 * @param limit The number of milliseconds to wait between invocations
 * @returns A throttled version of the function
 */
export function throttle<Args extends unknown[], R>(
  func: (...args: Args) => R,
  limit: number
): (...args: Args) => void {
  let inThrottle = false;
  let lastArgs: Args | null = null;

  return function throttled(...args: Args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}