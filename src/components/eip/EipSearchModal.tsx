import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { eipsData } from '../../data/eips';
import { EIP } from '../../types/eip';
import { getLaymanTitle, getProposalPrefix } from '../../utils';
import { debounce } from '../../utils/debounce';
import { eipSpecSearchService } from '../../services/eipSpecSearch';
import { highlightMatch } from '../search/highlightMatch';
import {
  SearchDialog,
  SearchDialogSearchRow,
  SearchEmptyState,
  SearchFilterButton,
  SearchFilterSelect,
  SearchKeycap,
} from '../search/SearchUi';

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
    if (eip.layer !== filters.layer) return false;
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

// Build a lookup map once for merging spec results with metadata results
const eipById = new Map(eipsData.map((eip) => [eip.id, eip]));

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

  // Warm up the spec search index when modal opens
  useEffect(() => {
    if (isOpen) {
      eipSpecSearchService.warmup();
    }
  }, [isOpen]);

  // Combined metadata + spec search (debounced)
  const performSearch = useMemo(
    () =>
      debounce(async (searchQuery: string, currentFilters: EipSearchFilters) => {
        const metadataResults = searchEips(searchQuery, eipsData, currentFilters);

        // Spec search only applies when there's a text query
        const queryTerms = searchQuery.trim().split(/\s+/).filter((t) => t.length > 0);
        if (queryTerms.length === 0) {
          setResults(metadataResults);
          return;
        }

        // Show metadata results immediately, then merge spec results
        setResults(metadataResults);

        let specResults: { eipId: number; score: number }[] = [];
        try {
          specResults = await eipSpecSearchService.search(searchQuery);
        } catch {
          // Index not available — metadata-only results are fine
          return;
        }

        if (specResults.length === 0) return;

        // Merge: boost metadata results that also match spec, add spec-only hits
        const metaById = new Map(metadataResults.map((r) => [r.eip.id, r]));
        const merged = [...metadataResults];

        for (const spec of specResults) {
          const existing = metaById.get(spec.eipId);
          if (existing) {
            existing.matchScore += SEARCH_WEIGHTS.description * 0.5;
            if (!existing.matchedFields.includes('spec')) {
              existing.matchedFields.push('spec');
            }
          } else {
            const eip = eipById.get(spec.eipId);
            if (eip && passesFilters(eip, currentFilters)) {
              merged.push({
                eip,
                matchScore: spec.score,
                matchedFields: ['spec'],
              });
            }
          }
        }

        merged.sort((a, b) => b.matchScore - a.matchScore);
        setResults(merged.slice(0, 50));
      }, 150),
    [],
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
      'spec': 'spec',
    };
    return displayMap[field] || field;
  };

  const hasActiveFilters = filters.forkName !== 'all' || filters.forkStatus !== 'all' || filters.layer !== 'all';
  const showResults = query.trim().length > 0 || hasActiveFilters;

  return (
    <SearchDialog isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-3xl">
      <div className="border-b border-slate-200 dark:border-slate-700">
        <SearchDialogSearchRow
          inputRef={inputRef}
          value={query}
          onChange={setQuery}
          placeholder="Search EIPs..."
          onClose={() => {
            onClose();
            setQuery('');
          }}
        />

        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <SearchFilterSelect
              value={filters.forkName}
              onChange={(forkName) => setFilters((current) => ({ ...current, forkName }))}
            >
              <option value="all">All Forks</option>
              {ACTIVE_FORKS.map(fork => (
                <option key={fork} value={fork}>{getForkDisplayName(fork)}</option>
              ))}
            </SearchFilterSelect>

            <SearchFilterSelect
              value={filters.forkStatus}
              onChange={(forkStatus) => setFilters((current) => ({ ...current, forkStatus }))}
            >
              <option value="all">All Statuses</option>
              {FORK_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </SearchFilterSelect>

            <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />

            {(['all', ...LAYERS] as const).map(layer => (
              <SearchFilterButton
                key={layer}
                active={filters.layer === layer}
                onClick={() => setFilters((current) => ({ ...current, layer }))}
                tone="blue"
              >
                {layer === 'all' ? 'All Layers' : layer}
              </SearchFilterButton>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={resultsContainerRef}
        className="max-h-[60vh] overflow-y-auto sm:max-h-96"
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
                              {eip.layer && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                  {eip.layer}
                                </span>
                              )}
                            </>
                          )}
                          {/* Matched field indicator */}
                          {matchedFields.length > 0 && !matchedFields.includes('title') && !matchedFields.includes('id') && !matchedFields.includes('description') && (
                            <span className="text-xs text-slate-400 dark:text-slate-400">
                              · {matchedFields.map(f => getFieldDisplayName(f)).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Enter hint for selected */}
                      <div className="hidden sm:flex items-center w-8 justify-center flex-shrink-0">
                        {isSelected && (
                          <SearchKeycap>↵</SearchKeycap>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <SearchEmptyState
              description="Search EIPs or use filters to browse"
              items={['Title', 'Author', 'Description', 'Spec']}
            />
          )}
      </div>

      {showResults && results.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <div className="flex items-center gap-2 sm:gap-4">
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            <div className="hidden sm:flex items-center gap-4">
              <span className="flex items-center gap-1">
                <SearchKeycap>↑↓</SearchKeycap>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <SearchKeycap>↵</SearchKeycap>
                Open
              </span>
              <span className="flex items-center gap-1">
                <SearchKeycap>esc</SearchKeycap>
                Close
              </span>
            </div>
          </div>
        </div>
      )}
    </SearchDialog>
  );
}
