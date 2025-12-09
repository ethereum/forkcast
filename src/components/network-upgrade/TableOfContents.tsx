import React, { useMemo } from 'react';
import { Tooltip } from '../ui';

interface TOCItem {
  id: string;
  label: string;
  type: 'section' | 'eip';
  count: number | null;
}

type LayerFilter = 'all' | 'EL' | 'CL';

interface TableOfContentsProps {
  items: TOCItem[];
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  layerFilter?: LayerFilter;
  onLayerFilterChange?: (filter: LayerFilter) => void;
  showLayerFilter?: boolean;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items,
  activeSection,
  onSectionClick,
  searchQuery,
  onSearchChange,
  layerFilter = 'all',
  onLayerFilterChange,
  showLayerFilter = false
}) => {

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase().trim();
    const matchingEipIds = new Set<string>();
    const sectionsWithMatches = new Set<string>();

    // Find all EIPs that match the search query
    let currentSection: string | null = null;
    items.forEach((item) => {
      if (item.type === 'section') {
        currentSection = item.id;
      } else if (item.type === 'eip') {
        const labelLower = item.label.toLowerCase();
        // Match against EIP number (e.g., "7702" matches "EIP-7702: ...")
        // or against title text
        if (labelLower.includes(query)) {
          matchingEipIds.add(item.id);
          if (currentSection) {
            sectionsWithMatches.add(currentSection);
          }
        }
      }
    });

    // Filter to only show sections with matches and their matching EIPs
    currentSection = null;
    return items.filter((item) => {
      if (item.type === 'section') {
        currentSection = item.id;
        // Always show Overview and Timeline sections, plus sections with matches
        return item.id === 'overview' || item.id === 'timeline' || sectionsWithMatches.has(item.id);
      } else {
        return matchingEipIds.has(item.id);
      }
    });
  }, [items, searchQuery]);

  const matchCount = useMemo(() => {
    return filteredItems.filter(item => item.type === 'eip').length;
  }, [filteredItems]);

  const totalEipCount = useMemo(() => {
    return items.filter(item => item.type === 'eip').length;
  }, [items]);

  return (
    <div className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-6 overflow-y-auto max-h-[calc(100vh-3rem)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">Contents</h3>
          <Tooltip text="Scroll to top" position="bottom">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              aria-label="Scroll to top"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V6M12 6l-5 5M12 6l5 5M5 3h14" />
              </svg>
            </button>
          </Tooltip>
        </div>

        {/* Search input */}
        <div className="relative mb-3 px-0.5">
          <input
            type="text"
            placeholder="Filter EIPs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            <Tooltip text="Show all EIPs" position="bottom" className="flex-1">
              <button
                onClick={() => onLayerFilterChange('all')}
                className={`w-full px-2 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
                  layerFilter === 'all'
                    ? 'border-slate-400 text-slate-700 bg-white dark:border-slate-400 dark:text-slate-200 dark:bg-slate-700'
                    : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800 dark:hover:border-slate-500'
                }`}
              >
                All
              </button>
            </Tooltip>
            <Tooltip text="Execution Layer" position="bottom" className="flex-1">
              <button
                onClick={() => onLayerFilterChange('EL')}
                className={`w-full px-2 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
                  layerFilter === 'EL'
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-600'
                    : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800 dark:hover:border-slate-500'
                }`}
              >
                EL
              </button>
            </Tooltip>
            <Tooltip text="Consensus Layer" position="bottom" className="flex-1">
              <button
                onClick={() => onLayerFilterChange('CL')}
                className={`w-full px-2 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
                  layerFilter === 'CL'
                    ? 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-600'
                    : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800 dark:hover:border-slate-500'
                }`}
              >
                CL
              </button>
            </Tooltip>
          </div>
        )}

        {/* Search results count */}
        {searchQuery && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 px-1">
            {matchCount === 0 ? 'No matches' : `${matchCount} of ${totalEipCount} EIPs`}
          </p>
        )}

        <nav className="space-y-1">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionClick(item.id)}
              className={`w-full text-left rounded transition-colors ${
                item.type === 'section'
                  ? `px-3 py-2 text-sm ${
                      activeSection === item.id
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`
                  : `px-6 py-1.5 text-xs ${
                      activeSection === item.id
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/10 dark:text-purple-300 font-medium'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={item.type === 'eip' ? 'truncate' : ''}>{item.label}</span>
                {item.count && !searchQuery && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 ml-2">{item.count}</span>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};