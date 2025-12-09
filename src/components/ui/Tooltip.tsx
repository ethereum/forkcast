import React, { useState, useRef } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  className?: string;
  position?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  text,
  className = '',
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const getTooltipStyle = (): React.CSSProperties => {
    if (!triggerRef.current) return {};

    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipHeight = 28;
    const padding = 4;

    if (position === 'bottom') {
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
          className="bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 shadow-lg dark:bg-slate-600 dark:text-slate-100"
          style={getTooltipStyle()}
        >
          {text}
          <div className={`absolute left-1/2 transform -translate-x-1/2 border-4 border-transparent ${
            position === 'bottom'
              ? '-top-2 border-b-slate-800 dark:border-b-slate-600'
              : 'top-full border-t-slate-800 dark:border-t-slate-600'
          }`}></div>
        </div>
      )}
    </div>
  );
};