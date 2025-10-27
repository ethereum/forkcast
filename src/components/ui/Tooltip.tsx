import React, { useState } from "react";

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  text,
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 animate-in fade-in duration-150">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
};
