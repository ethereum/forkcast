import React from 'react';

interface EipSearchProps {
  onOpen: () => void;
}

export const EipSearch: React.FC<EipSearchProps> = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2.5 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
    >
      <svg
        className="w-4 h-4 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">Search EIPs...</span>
      <kbd className="hidden sm:inline text-xs px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 rounded font-mono">
        ⌘F
      </kbd>
    </button>
  );
};
