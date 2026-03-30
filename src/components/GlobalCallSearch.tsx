import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { searchIndexService } from '../services/searchIndex';
import { formatDate } from '../utils/date';
import { debounce } from '../utils/debounce';
import { highlightMatch } from './search/highlightMatch';
import {
  SearchDialog,
  SearchDialogSearchRow,
  SearchFilterButton,
  SearchKeycap,
} from './search/SearchUi';

interface GlobalSearchResult {
  callType: string;
  callDate: string;
  callNumber: string;
  callTitle: string;
  callPath: string;
  type: 'transcript' | 'chat' | 'agenda' | 'action';
  timestamp: string;
  speaker?: string;
  text: string;
  matchScore?: number;
}

interface GlobalCallSearchProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function GlobalCallSearch({ isOpen, onClose, initialQuery = '' }: GlobalCallSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexBuilding, setIndexBuilding] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'transcript' | 'chat' | 'agenda' | 'action'>('all');
  const [callTypeFilter, setCallTypeFilter] = useState<'all' | 'ACDC' | 'ACDE' | 'ACDT'>('all');
  const [searchStats, setSearchStats] = useState<{ total: number; shown: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Initialize search index on mount
  useEffect(() => {
    if (!isOpen) {
      setIndexBuilding(false);
      return;
    }

    let cancelled = false;

    const initIndex = async () => {
      const stats = searchIndexService.getStats();
      const needsBuild = !stats || searchIndexService.needsRebuild();

      if (needsBuild) {
        setIndexBuilding(true);
      }

      try {
        await searchIndexService.getIndex();
      } catch (error) {
        console.error('Failed to initialize search index:', error);
      } finally {
        if (!cancelled) {
          setIndexBuilding(false);
        }
      }
    };

    void initIndex();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Debounced search function
  const performSearch = useMemo(
    () =>
      debounce(async (searchQuery: string, contentType: string, callType: string) => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
          setResults([]);
          setSearchStats(null);
          return;
        }

        setLoading(true);
        try {
          const searchResults = await searchIndexService.search(searchQuery, {
            callType: callType === 'all' ? undefined : callType as 'ACDC' | 'ACDE' | 'ACDT',
            contentType: contentType === 'all' ? undefined : contentType as 'transcript' | 'chat' | 'agenda' | 'action',
            limit: 500
          });

          const formattedResults: GlobalSearchResult[] = searchResults.map(result => ({
            callType: result.callType,
            callDate: result.callDate,
            callNumber: result.callNumber,
            callTitle: `${result.callType.toUpperCase()} Call #${result.callNumber}`,
            callPath: `/calls/${result.callType}/${result.callNumber}`,
            type: result.type,
            timestamp: result.timestamp,
            speaker: result.speaker,
            text: result.text,
            matchScore: 0
          }));

          const limitedResults = formattedResults.slice(0, 200);
          setResults(limitedResults);
          setSearchStats({ total: formattedResults.length, shown: limitedResults.length });
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
          setSearchStats(null);
        } finally {
          setLoading(false);
        }
      }, 300),
    []
  );

  // Trigger search on query or filter change
  useEffect(() => {
    performSearch(query, filterType, callTypeFilter);
  }, [query, filterType, callTypeFilter, performSearch]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        setQuery('');
        setSelectedIndex(0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        const result = results[selectedIndex];
        const url = `${result.callPath}?search=${encodeURIComponent(query)}&timestamp=${result.timestamp}&type=${result.type}&text=${encodeURIComponent(result.text)}`;
        window.location.href = url;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, results, selectedIndex, query]);

  // Scroll selected result into view
  useEffect(() => {
    if (resultsContainerRef.current && results.length > 0) {
      const selectedElement = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, results]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const getTypeIcon = (type: GlobalSearchResult['type']) => {
    switch (type) {
      case 'transcript':
        return '📝';
      case 'chat':
        return '💬';
      case 'agenda':
        return '📋';
      case 'action':
        return '✅';
      default:
        return '📄';
    }
  };

  const getTypeColor = (type: GlobalSearchResult['type']) => {
    switch (type) {
      case 'transcript':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50';
      case 'chat':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50';
      case 'agenda':
        return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50';
      case 'action':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50';
    }
  };

  return (
    <SearchDialog isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-4xl">
      <div className="border-b border-slate-200 dark:border-slate-700">
        <SearchDialogSearchRow
          inputRef={inputRef}
          value={query}
          onChange={setQuery}
          placeholder="Search calls..."
          onClose={() => {
            onClose();
            setQuery('');
          }}
          loading={loading}
        />

        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-4">
          {(['all', 'transcript', 'chat', 'agenda', 'action'] as const).map(filter => (
            <SearchFilterButton
              key={filter}
              active={filterType === filter}
              onClick={() => setFilterType(filter)}
              tone="blue"
            >
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </SearchFilterButton>
          ))}

          <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />

          {(['all', 'ACDC', 'ACDE', 'ACDT'] as const).map(filter => (
            <SearchFilterButton
              key={filter}
              active={callTypeFilter === filter}
              onClick={() => setCallTypeFilter(filter)}
              tone="purple"
            >
              {filter === 'all' ? 'All Calls' : filter}
            </SearchFilterButton>
          ))}
        </div>

        {indexBuilding && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span>Building search index...</span>
            </div>
          </div>
        )}
      </div>

      <div
        ref={resultsContainerRef}
        className="max-h-[60vh] overflow-y-auto sm:max-h-96"
      >
          {query && results.length === 0 && !loading && !indexBuilding ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-2">Try different keywords or filters</p>
            </div>
          ) : query ? (
            <div className="py-2">
              {results.map((result, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <Link
                    key={`${result.callPath}-${result.timestamp}-${index}`}
                    to={`${result.callPath}?search=${encodeURIComponent(query)}&timestamp=${result.timestamp}&type=${result.type}&text=${encodeURIComponent(result.text)}`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`block w-full text-left px-3 sm:px-4 py-4 sm:py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors touch-manipulation ${
                      isSelected ? 'bg-slate-50 dark:bg-slate-700/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type Badge */}
                      <span className={`inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-lg text-sm flex-shrink-0 ${getTypeColor(result.type)}`}>
                        {getTypeIcon(result.type)}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Call Info */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex-shrink-0">
                            {result.callTitle}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                            {formatDate(new Date(result.callDate))}
                          </span>
                          <span className="text-xs font-mono text-blue-600 dark:text-blue-400 flex-shrink-0">
                            {result.timestamp}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 capitalize flex-shrink-0">
                            {result.type}
                          </span>
                        </div>

                        {/* Speaker */}
                        {result.speaker && (
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {result.speaker}
                          </div>
                        )}

                        {/* Text */}
                        <p className="text-sm sm:text-sm text-base text-slate-900 dark:text-slate-100 line-clamp-3 sm:line-clamp-2 leading-relaxed">
                          {highlightMatch(result.text, query)}
                        </p>
                      </div>

                        {/* Navigate hint - hide on mobile */}
                      <div className="hidden sm:flex items-center w-8 justify-center">
                        {isSelected && (
                          <SearchKeycap>↵</SearchKeycap>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 dark:text-slate-400">
              <p className="text-sm mb-3">Start typing to search across all calls</p>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-500">📝</span> Transcript
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-purple-500">💬</span> Chat messages
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-amber-500">📋</span> Agenda topics
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-500">✅</span> Action items
                </div>
              </div>
            </div>
          )}
      </div>

      {query && results.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <div className="flex items-center gap-2 sm:gap-4">
            <span>{searchStats?.shown || results.length} result{(searchStats?.shown || results.length) !== 1 ? 's' : ''}</span>
            {searchStats && searchStats.shown < searchStats.total && (
              <span className="text-amber-600 dark:text-amber-400">
                of {searchStats.total}
              </span>
            )}
            <div className="hidden sm:flex items-center gap-4">
              <span className="flex items-center gap-1">
                <SearchKeycap>↑↓</SearchKeycap>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <SearchKeycap>↵</SearchKeycap>
                Open
              </span>
            </div>
          </div>
        </div>
      )}
    </SearchDialog>
  );
}
