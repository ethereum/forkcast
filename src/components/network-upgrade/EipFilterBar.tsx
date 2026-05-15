import React from 'react';

type LayerFilter = 'all' | 'EL' | 'CL';

interface EipFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  layerFilter?: LayerFilter;
  onLayerFilterChange?: (filter: LayerFilter) => void;
  showLayerFilter?: boolean;
  matchCount: number;
  totalEipCount: number;
}

export const EipFilterBar: React.FC<EipFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  layerFilter = 'all',
  onLayerFilterChange,
  showLayerFilter = false,
  matchCount,
  totalEipCount,
}) => {
  return (
    <>
      {/* Search input */}
      <div className="relative mb-3 px-0.5">
        <input
          type="text"
          placeholder="Filter EIPs..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-1.5 text-base lg:text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Layer filter */}
      {showLayerFilter && onLayerFilterChange && (
        <div className="flex gap-1 mb-3 px-0.5">
          <button
            onClick={() => onLayerFilterChange('all')}
            title="Show all EIPs"
            className={`flex-1 px-2 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
              layerFilter === 'all'
                ? 'border-slate-400 text-slate-700 bg-white dark:border-slate-400 dark:text-slate-200 dark:bg-slate-700'
                : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800 dark:hover:border-slate-500'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onLayerFilterChange('EL')}
            title="Execution Layer"
            className={`flex-1 px-2 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
              layerFilter === 'EL'
                ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-600'
                : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800 dark:hover:border-slate-500'
            }`}
          >
            EL
          </button>
          <button
            onClick={() => onLayerFilterChange('CL')}
            title="Consensus Layer"
            className={`flex-1 px-2 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
              layerFilter === 'CL'
                ? 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-600'
                : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800 dark:hover:border-slate-500'
            }`}
          >
            CL
          </button>
        </div>
      )}

      {/* Search results count */}
      {searchQuery && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 px-1">
          {matchCount === 0 ? 'No matches' : `${matchCount} of ${totalEipCount} EIPs`}
        </p>
      )}
    </>
  );
};
