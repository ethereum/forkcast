import React, { useState, useRef } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text?: string;
  content?: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  text,
  content,
  className = '',
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={triggerRef}
      className={`relative ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className="bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-600 text-slate-900 dark:text-slate-100 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-[9999] shadow-xl"
          style={getTooltipStyle()}
        >
          {content || text}
        </div>
      )}
    </div>
  );
};