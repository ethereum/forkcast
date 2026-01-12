import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { eipsData } from '../../data/eips';
import { EIP } from '../../types/eip';
import { getLaymanTitle, getProposalPrefix } from '../../utils';
import { debounce } from '../../utils/debounce';

interface EipSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

interface EipSearchResult {
  eip: EIP;
  matchScore: number;
  matchedFields: string[];
}

interface EipSearchFilters {
  forkName: string;
  forkStatus: string;
  layer: string;
}

// Search weights for different fields
const SEARCH_WEIGHTS = {
  id: 100,
  title: 50,
  laymanDescription: 30,
  description: 20,
  author: 15,
  benefits: 10,
  northStars: 10,
};

// Active forks in reverse chronological order
const ACTIVE_FORKS = ['Hegota', 'Glamsterdam', 'Fusaka', 'Pectra'] as const;

// Fork statuses
const FORK_STATUSES = ['Included', 'Scheduled', 'Proposed', 'Considered', 'Declined'] as const;

// Layers
const LAYERS = ['EL', 'CL'] as const;

function passesFilters(eip: EIP, filters: EipSearchFilters): boolean {
  // If no filters are set, pass everything
  if (filters.forkName === 'all' && filters.forkStatus === 'all' && filters.layer === 'all') {
    return true;
  }

  // No fork relationships but filters require one
  if (eip.forkRelationships.length === 0) {
    return false;
  }

  // Get relevant forks based on fork name filter
  const relevantForks = filters.forkName !== 'all'
    ? eip.forkRelationships.filter(fr => fr.forkName.toLowerCase() === filters.forkName.toLowerCase())
    : eip.forkRelationships;

  if (relevantForks.length === 0 && filters.forkName !== 'all') {
    return false;
  }

  // Check fork status filter (most recent status in the relevant fork)
  if (filters.forkStatus !== 'all') {
    const hasStatus = relevantForks.some(fr => {
      const currentStatus = fr.statusHistory[fr.statusHistory.length - 1]?.status;
      return currentStatus === filters.forkStatus;
    });
    if (!hasStatus) return false;
  }

  // Check layer filter
  if (filters.layer !== 'all') {
    const hasLayer = relevantForks.some(fr => fr.layer === filters.layer);
    if (!hasLayer) return false;
  }

  return true;
}

function calculateMatchScore(
  eip: EIP,
  queryTerms: string[]
): { score: number; matchedFields: string[] } {
  if (queryTerms.length === 0) {
    return { score: 1, matchedFields: [] }; // Return score of 1 for filter-only searches
  }

  let totalScore = 0;
  const matchedFields: string[] = [];

  // ID match (exact or partial)
  const idStr = eip.id.toString();
  if (queryTerms.some(term => idStr.includes(term))) {
    totalScore += SEARCH_WEIGHTS.id;
    matchedFields.push('id');
  }

  // Title match
  const title = getLaymanTitle(eip).toLowerCase();
  if (queryTerms.some(term => title.includes(term))) {
    totalScore += SEARCH_WEIGHTS.title;
    matchedFields.push('title');
  }

  // Layman description match
  if (eip.laymanDescription) {
    const laymanDesc = eip.laymanDescription.toLowerCase();
    if (queryTerms.some(term => laymanDesc.includes(term))) {
      totalScore += SEARCH_WEIGHTS.laymanDescription;
      matchedFields.push('laymanDescription');
    }
  }

  // Description match
  if (eip.description) {
    const desc = eip.description.toLowerCase();
    if (queryTerms.some(term => desc.includes(term))) {
      totalScore += SEARCH_WEIGHTS.description;
      matchedFields.push('description');
    }
  }

  // Author match
  if (eip.author) {
    const author = eip.author.toLowerCase();
    if (queryTerms.some(term => author.includes(term))) {
      totalScore += SEARCH_WEIGHTS.author;
      matchedFields.push('author');
    }
  }

  // Benefits match
  if (eip.benefits?.length) {
    const benefits = eip.benefits.join(' ').toLowerCase();
    if (queryTerms.some(term => benefits.includes(term))) {
      totalScore += SEARCH_WEIGHTS.benefits;
      matchedFields.push('benefits');
    }
  }

  // North stars match
  if (eip.northStars?.length) {
    const northStars = eip.northStars.join(' ').toLowerCase();
    if (queryTerms.some(term => northStars.includes(term))) {
      totalScore += SEARCH_WEIGHTS.northStars;
      matchedFields.push('northStars');
    }
  }

  return { score: totalScore, matchedFields };
}

function searchEips(
  query: string,
  eips: EIP[],
  filters: EipSearchFilters
): EipSearchResult[] {
  const queryLower = query.toLowerCase().trim();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 0);

  return eips
    .map(eip => {
      // Step 1: Apply filters first
      if (!passesFilters(eip, filters)) {
        return null;
      }

      // Step 2: Calculate match score
      const { score, matchedFields } = calculateMatchScore(eip, queryTerms);

      // If query is empty but filters pass, include with minimal score
      if (queryTerms.length === 0) {
        return {
          eip,
          matchScore: 1,
          matchedFields: [],
        };
      }

      if (score === 0) return null;

      return {
        eip,
        matchScore: score,
        matchedFields,
      };
    })
    .filter((result): result is EipSearchResult => result !== null)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 50);
}

export default function EipSearchModal({ isOpen, onClose, initialQuery = '' }: EipSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<EipSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filters, setFilters] = useState<EipSearchFilters>({
    forkName: 'all',
    forkStatus: 'all',
    layer: 'all',
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounced search function
  const performSearch = useMemo(
    () =>
      debounce((searchQuery: string, currentFilters: EipSearchFilters) => {
        const searchResults = searchEips(searchQuery, eipsData, currentFilters);
        setResults(searchResults);
      }, 150),
    []
  );

  // Trigger search on query or filter change
  useEffect(() => {
    performSearch(query, filters);
  }, [query, filters, performSearch]);

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
        navigate(`/eips/${results[selectedIndex].eip.id}`);
        onClose();
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, results, selectedIndex, navigate, query]);

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

  // Highlight matching text
  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;

    const queryWords = searchQuery.trim().split(/\s+/).filter(w => w.length > 0);
    if (queryWords.length === 0) return text;

    const pattern = queryWords
      .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    const parts = text.split(new RegExp(`(${pattern})`, 'gi'));

    return (
      <>
        {parts.map((part, i) => {
          const isMatch = queryWords.some(word =>
            part.toLowerCase() === word.toLowerCase()
          );
          return isMatch ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/80 text-slate-800 dark:text-slate-900 font-medium">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </>
    );
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Included':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'Scheduled':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'Proposed':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Considered':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Declined':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  // Get fork display name
  const getForkDisplayName = (forkName: string): string => {
    const displayMap: Record<string, string> = {
      'Hegota': 'Hegotá'
    };
    return displayMap[forkName] || forkName;
  };

  // Get field display name
  const getFieldDisplayName = (field: string): string => {
    const displayMap: Record<string, string> = {
      'id': 'ID',
      'title': 'title',
      'laymanDescription': 'summary',
      'description': 'description',
      'author': 'author',
      'benefits': 'benefits',
      'northStars': 'north stars',
    };
    return displayMap[field] || field;
  };

  if (!isOpen) return null;

  const hasActiveFilters = filters.forkName !== 'all' || filters.forkStatus !== 'all' || filters.layer !== 'all';
  const showResults = query.trim().length > 0 || hasActiveFilters;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-20 px-2 sm:px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden animate-[slideDown_0.2s_ease-out] max-h-[90vh] sm:max-h-none">
        {/* Search Header */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 p-3 sm:p-4">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search EIPs by title, author, description..."
              className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none text-base min-h-[44px] sm:min-h-0"
            />
            <button
              onClick={() => { onClose(); setQuery(''); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 -m-2 touch-manipulation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Filters */}
          <div className="px-3 sm:px-4 pb-3 space-y-2">
            {/* Row 1: Fork and Status */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <select
                value={filters.forkName}
                onChange={(e) => setFilters(f => ({ ...f, forkName: e.target.value }))}
                className="px-2.5 py-1.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-0 outline-none cursor-pointer"
              >
                <option value="all">All Forks</option>
                {ACTIVE_FORKS.map(fork => (
                  <option key={fork} value={fork}>{getForkDisplayName(fork)}</option>
                ))}
              </select>

              <div className="h-3 w-px bg-slate-300 dark:bg-slate-600" />

              <select
                value={filters.forkStatus}
                onChange={(e) => setFilters(f => ({ ...f, forkStatus: e.target.value }))}
                className="px-2.5 py-1.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-0 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                {FORK_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <div className="h-3 w-px bg-slate-300 dark:bg-slate-600" />

              {/* Layer Pills - keep as buttons since only 2 options */}
              {(['all', ...LAYERS] as const).map(layer => (
                <button
                  key={layer}
                  onClick={() => setFilters(f => ({ ...f, layer }))}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                    filters.layer === layer
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {layer === 'all' ? 'All Layers' : layer}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div
          ref={resultsContainerRef}
          className="max-h-96 sm:max-h-96 overflow-y-auto"
        >
          {showResults && results.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">No EIPs found</p>
              <p className="text-xs mt-2">Try different keywords or filters</p>
            </div>
          ) : showResults ? (
            <div className="py-2">
              {results.map((result, index) => {
                const isSelected = index === selectedIndex;
                const { eip, matchedFields } = result;
                const title = getLaymanTitle(eip);
                const prefix = getProposalPrefix(eip);

                // Get most recent fork info
                const recentFork = eip.forkRelationships[eip.forkRelationships.length - 1];
                const currentStatus = recentFork?.statusHistory[recentFork.statusHistory.length - 1]?.status;

                return (
                  <button
                    key={eip.id}
                    onClick={() => {
                      navigate(`/eips/${eip.id}`);
                      onClose();
                      setQuery('');
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full text-left px-3 sm:px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors touch-manipulation ${
                      isSelected ? 'bg-slate-50 dark:bg-slate-700/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* EIP Number Badge */}
                      <span className="text-xs font-mono font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded flex-shrink-0">
                        {prefix}-{eip.id}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
                          {highlightMatch(title, query)}
                        </div>

                        {/* Description */}
                        {eip.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
                            {highlightMatch(eip.description, query)}
                          </p>
                        )}

                        {/* Meta info row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {recentFork && (
                            <>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                {getForkDisplayName(recentFork.forkName)}
                              </span>
                              {currentStatus && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(currentStatus)}`}>
                                  {currentStatus}
                                </span>
                              )}
                              {recentFork.layer && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                  {recentFork.layer}
                                </span>
                              )}
                            </>
                          )}
                          {/* Matched field indicator */}
                          {matchedFields.length > 0 && !matchedFields.includes('title') && !matchedFields.includes('id') && !matchedFields.includes('description') && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              · {matchedFields.map(f => getFieldDisplayName(f)).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Enter hint for selected */}
                      <div className="hidden sm:flex items-center w-8 justify-center flex-shrink-0">
                        {isSelected && (
                          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded">
                            ↵
                          </kbd>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              <p className="text-sm mb-3">Search EIPs or use filters to browse</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto text-xs">
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">title</span>
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">author</span>
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">description</span>
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">benefits</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {showResults && results.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 sm:gap-4">
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
              <div className="hidden sm:flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs">↵</kbd>
                  Open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs">esc</kbd>
                  Close
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
