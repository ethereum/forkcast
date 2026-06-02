import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  text?: string;
  content?: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'right';
  block?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  text,
  content,
  className = '',
  position = 'top',
  block = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 6;

    if (position === 'right') {
      setTooltipStyle({
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.right + padding,
        transform: 'translateY(-50%)',
      });
    } else if (position === 'bottom') {
      setTooltipStyle({
        position: 'fixed',
        top: rect.bottom + padding,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      });
    } else {
      setTooltipStyle({
        position: 'fixed',
        top: rect.top - tooltipRect.height - padding,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      });
    }
  }, [position]);

  const tooltipCallbackRef = useCallback((node: HTMLSpanElement | null) => {
    tooltipRef.current = node;
    if (node) updatePosition();
  }, [updatePosition]);

  return (
    <span
      ref={triggerRef}
      className={`relative ${block ? 'block' : 'inline-block'} ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && createPortal(
        <span
          ref={tooltipCallbackRef}
          className="bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-600 text-slate-900 dark:text-slate-100 text-xs px-3 py-1.5 rounded-lg z-[9999] shadow-xl hidden md:block pointer-events-none max-w-64 w-max"
          style={tooltipStyle}
        >
          {content || text}
        </span>,
        document.body
      )}
    </span>
  );
};