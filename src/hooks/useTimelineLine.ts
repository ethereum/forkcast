import { useLayoutEffect, useRef } from 'react';

/**
 * Measures first and last circle positions to set the vertical timeline line
 * height precisely, regardless of variable text content below the last circle.
 * Listens for CSS transition ends (expand/collapse) to stay accurate.
 */
export function useTimelineLine(isExpanded: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const lastCircleRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    function update() {
      const container = containerRef.current;
      const line = lineRef.current;
      const lastCircle = lastCircleRef.current;
      if (!container || !line || !lastCircle) return;

      const containerTop = container.getBoundingClientRect().top;
      const circleRect = lastCircle.getBoundingClientRect();
      const lastCenter = circleRect.top + circleRect.height / 2 - containerTop;
      // 20px = center of first circle (w-10 h-10 = 40px, half = 20px)
      line.style.height = `${lastCenter - 20}px`;
    }

    update();

    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('transitionend', update);
    return () => container.removeEventListener('transitionend', update);
  }, [isExpanded]);

  return { containerRef, lineRef, lastCircleRef };
}
