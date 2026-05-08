import React, { useMemo } from 'react';
import { Tooltip } from '../ui';
import { EipFilterBar } from './EipFilterBar';

interface TOCItem {
  id: string;
  label: string;
  type: 'section' | 'eip';
  count: number | null;
  layer?: 'EL' | 'CL' | null;
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
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] flex flex-col">
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

        <EipFilterBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          layerFilter={layerFilter}
          onLayerFilterChange={onLayerFilterChange}
          showLayerFilter={showLayerFilter}
          matchCount={matchCount}
          totalEipCount={totalEipCount}
        />

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-2 [scrollbar-gutter:stable]">
          {filteredItems.map((item) => {
            const button = (
              <button
                key={item.id}
                onClick={() => onSectionClick(item.id)}
                className={`w-full text-left rounded transition-colors overflow-hidden ${
                  item.type === 'section'
                    ? `px-3 py-2 text-sm ${
                        activeSection === item.id
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`
                    : `px-6 py-1.5 text-xs cursor-pointer ${
                        activeSection === item.id
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/10 dark:text-purple-300 font-medium'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`
                }`}
              >
                <div className="flex items-center justify-between min-w-0">
                  <span className={item.type === 'eip' ? 'truncate min-w-0' : ''}>{item.label}</span>
                  {item.count && !searchQuery && (
                    <span className="text-xs text-slate-400 dark:text-slate-400 flex-shrink-0 ml-2">{item.count}</span>
                  )}
                </div>
              </button>
            );

            if (item.type === 'eip') {
              const tooltipContent = (
                <span className="flex items-center gap-2">
                  {item.layer && (
                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                      item.layer === 'EL'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                        : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300'
                    }`}>
                      {item.layer}
                    </span>
                  )}
                  <span>{item.label}</span>
                </span>
              );

              return (
                <Tooltip key={item.id} content={tooltipContent} position="right" block>
                  {button}
                </Tooltip>
              );
            }

            return <div key={item.id}>{button}</div>;
          })}
        </nav>
      </div>
    </div>
  );
};
