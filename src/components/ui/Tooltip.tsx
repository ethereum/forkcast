import React, { useState, useRef } from 'react';

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

  const getTooltipStyle = (): React.CSSProperties => {
    if (!triggerRef.current) return {};

    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipHeight = 32;
    const padding = 6;

    if (position === 'right') {
      return {
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.right + padding,
        transform: 'translateY(-50%)',
      };
    } else if (position === 'bottom') {
      return {
        position: 'fixed',
        top: rect.bottom + padding,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      };
    } else {
      return {
        position: 'fixed',
        top: rect.top - tooltipHeight - padding,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      };
    }
  };

  return (
    <span
      ref={triggerRef}
      className={`relative ${block ? 'block' : 'inline-block'} ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <span
          className="bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-600 text-slate-900 dark:text-slate-100 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-[9999] shadow-xl block"
          style={getTooltipStyle()}
        >
          {content || text}
        </span>
      )}
    </span>
  );
};