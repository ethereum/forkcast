import React, { useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from './navigation';
import { eipsData } from '../data/eips';
import { getProposalPrefix, getLaymanTitle, getInclusionStage, isHeadlinerInAnyFork, wasHeadlinerCandidateInAnyFork, getEipLayer, isPendingEip } from '../utils/eip';
import { EipSearch } from './eip/EipSearch';
import { openGlobalSearch } from '../domain/search/globalSearchBridge';
import { Tooltip, UpgradeStageBadge } from './ui';
import { networkUpgrades } from '../data/upgrades';

type SortField = 'number' | 'date' | 'status' | 'updated' | 'headliner';
type SortDirection = 'asc' | 'desc';

// Stages that don't get their own filter chip and are folded into a broader one.
// Networking and Informational are forms of scheduling; Withdrawn is a form of declining.
const STAGE_FILTER_ALIASES: Record<string, string> = {
  'Networking': 'Scheduled for Inclusion',
  'Informational': 'Scheduled for Inclusion',
  'Withdrawn': 'Declined for Inclusion',
};

const toStageFilter = (stage: string): string => STAGE_FILTER_ALIASES[stage] ?? stage;

// Short names for the verbose inclusion stages, used for both the chip labels
// and the `stage` query param (e.g. `stage=Scheduled`).
const STAGE_SHORT_NAMES: Record<string, string> = {
  'Proposed for Inclusion': 'Proposed',
  'Considered for Inclusion': 'Considered',
  'Scheduled for Inclusion': 'Scheduled',
  'Included': 'Included',
  'Declined for Inclusion': 'Declined',
};

const STAGE_BY_SHORT_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STAGE_SHORT_NAMES).map(([stage, short]) => [short, stage])
);

// Filters live in the query string so a filtered view can be shared.
const FILTER_PARAMS = ['upgrade', 'stage', 'status', 'type', 'layer', 'headliner'] as const;
type FilterParam = (typeof FILTER_PARAMS)[number];

const encodeFilterValue = (key: FilterParam, value: string): string =>
  key === 'stage' ? STAGE_SHORT_NAMES[value] ?? value : value;

const decodeFilterValue = (key: FilterParam, value: string): string =>
  key === 'stage' ? STAGE_BY_SHORT_NAME[value] ?? value : value;

const readParamValues = (params: URLSearchParams, key: FilterParam): string[] =>
  (params.get(key) ?? '').split(',').filter(Boolean);

const readFilter = (params: URLSearchParams, key: FilterParam): Set<string> =>
  new Set(readParamValues(params, key).map(value => decodeFilterValue(key, value)));

const SORT_FIELDS: SortField[] = ['number', 'date', 'status', 'updated', 'headliner'];
const DEFAULT_SORT_FIELD: SortField = 'updated';

/** Newest/highest first reads better for everything except the alphabetical status sort. */
const defaultSortDirection = (field: SortField): SortDirection =>
  field === 'status' ? 'asc' : 'desc';

const EipsIndexPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilters = useMemo(() => readFilter(searchParams, 'status'), [searchParams]);
  const forkFilters = useMemo(() => readFilter(searchParams, 'upgrade'), [searchParams]);
  const categoryFilters = useMemo(() => readFilter(searchParams, 'type'), [searchParams]);
  const stageFilters = useMemo(() => readFilter(searchParams, 'stage'), [searchParams]);
  const layerFilters = useMemo(() => readFilter(searchParams, 'layer'), [searchParams]);
  const headlinerFilters = useMemo(() => readFilter(searchParams, 'headliner'), [searchParams]);
  const sortParam = searchParams.get('sort') as SortField | null;
  const sortField = sortParam && SORT_FIELDS.includes(sortParam) ? sortParam : DEFAULT_SORT_FIELD;
  const dirParam = searchParams.get('dir');
  const sortDirection: SortDirection =
    dirParam === 'asc' || dirParam === 'desc' ? dirParam : defaultSortDirection(sortField);
  const requestedPage = Math.max(1, Math.trunc(Number(searchParams.get('page'))) || 1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const PAGE_SIZE = 50;

  // Extract unique values for filters
  const { statuses, forks, categories, stages, layers } = useMemo(() => {
    const statusSet = new Set<string>();
    const forkSet = new Set<string>();
    const categorySet = new Set<string>();
    const stageSet = new Set<string>();
    const layerSet = new Set<string>();

    eipsData.filter(eip => !isPendingEip(eip)).forEach(eip => {
      if (eip.status) statusSet.add(eip.status);
      // Add category or type since we display category || type
      const typeValue = eip.category || eip.type;
      if (typeValue) categorySet.add(typeValue);
      const layer = getEipLayer(eip);
      if (layer) layerSet.add(layer);

      eip.forkRelationships.forEach(fork => {
        forkSet.add(fork.forkName);

        // Get inclusion stage for this fork
        const stage = getInclusionStage(eip, fork.forkName);
        if (stage && stage !== 'Unknown') {
          stageSet.add(toStageFilter(stage));
        }
      });
    });

    // Define chronological order for forks (reverse chronological - latest first)
    const forkOrder = ['Hegota', 'Glamsterdam', 'Fusaka', 'Pectra', 'Dencun', 'Shapella'];
    const sortedForks = Array.from(forkSet).sort((a, b) => {
      const indexA = forkOrder.indexOf(a);
      const indexB = forkOrder.indexOf(b);
      // If both are in the order list, sort by index
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // If only one is in the order list, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // If neither is in the order list, sort alphabetically
      return a.localeCompare(b);
    });

    // Define logical order for stages
    const stageOrder = [
      'Proposed for Inclusion',
      'Considered for Inclusion',
      'Scheduled for Inclusion',
      'Included',
      'Declined for Inclusion',
    ];
    const sortedStages = Array.from(stageSet).sort((a, b) => {
      const indexA = stageOrder.indexOf(a);
      const indexB = stageOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    const sortedLayers = Array.from(layerSet).sort((a, b) => (a === 'EL' ? -1 : b === 'EL' ? 1 : a.localeCompare(b)));

    return {
      statuses: Array.from(statusSet).sort(),
      forks: sortedForks,
      categories: Array.from(categorySet).sort(),
      stages: sortedStages,
      layers: sortedLayers,
    };
  }, []);

  // Add "No Fork" to forks list
  const forksWithNone = [...forks, 'No Fork'];

  // Filter and sort EIPs
  const filteredAndSortedEips = useMemo(() => {
    let filtered = eipsData.filter(eip => !isPendingEip(eip));

    // Apply status filter
    if (statusFilters.size > 0) {
      filtered = filtered.filter(eip => statusFilters.has(eip.status));
    }

    // Apply fork + stage filters together: a single fork relationship must satisfy
    // both, so an EIP declined from one upgrade isn't matched by a later upgrade's stage
    if (forkFilters.size > 0 || stageFilters.size > 0) {
      filtered = filtered.filter(eip => {
        if (forkFilters.has('No Fork') && eip.forkRelationships.length === 0) {
          // EIPs with no fork relationships have no stage to match
          return stageFilters.size === 0;
        }
        return eip.forkRelationships.some(fork => {
          if (forkFilters.size > 0 && !forkFilters.has(fork.forkName)) return false;
          if (stageFilters.size === 0) return true;
          return stageFilters.has(toStageFilter(getInclusionStage(eip, fork.forkName)));
        });
      });
    }

    // Apply category filter
    if (categoryFilters.size > 0) {
      filtered = filtered.filter(eip => {
        const typeValue = eip.category || eip.type;
        return typeValue && categoryFilters.has(typeValue);
      });
    }

    // Apply layer filter
    if (layerFilters.size > 0) {
      filtered = filtered.filter(eip => {
        const layer = getEipLayer(eip);
        return layer && layerFilters.has(layer);
      });
    }

    // Apply headliner filter
    if (headlinerFilters.size > 0) {
      filtered = filtered.filter(eip => {
        const isSelected = isHeadlinerInAnyFork(eip);
        const isProposed = wasHeadlinerCandidateInAnyFork(eip) && !isSelected;
        return (headlinerFilters.has('Selected') && isSelected) || (headlinerFilters.has('Proposed') && isProposed);
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'number':
          compareValue = a.id - b.id;
          break;
        case 'date':
          compareValue = new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
          break;
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
        case 'updated': {
          // Get most recent update date for each EIP
          const getUpdateDate = (eip: typeof a) => {
            if (eip.forkRelationships.length === 0) return 0;
            const mostRecentFork = eip.forkRelationships[eip.forkRelationships.length - 1];
            const statusWithDate = [...mostRecentFork.statusHistory]
              .reverse()
              .find(status => status.date);
            return statusWithDate?.date ? new Date(statusWithDate.date).getTime() : 0;
          };
          compareValue = getUpdateDate(a) - getUpdateDate(b);
          break;
        }
        case 'headliner': {
          // Sort order: selected (2) > proposed (1) > none (0)
          const getHeadlinerScore = (eip: typeof a) => {
            if (isHeadlinerInAnyFork(eip)) return 2;
            if (wasHeadlinerCandidateInAnyFork(eip)) return 1;
            return 0;
          };
          compareValue = getHeadlinerScore(a) - getHeadlinerScore(b);
          break;
        }
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [statusFilters, forkFilters, categoryFilters, stageFilters, layerFilters, headlinerFilters, sortField, sortDirection]);

  // Toggle a filter value in the query string. Changing the result set invalidates
  // the current page, so `page` is dropped alongside every filter/sort change.
  const toggleFilter = useCallback((key: FilterParam, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const encoded = encodeFilterValue(key, value);
      const values = new Set(readParamValues(next, key));
      if (values.has(encoded)) values.delete(encoded);
      else values.add(encoded);
      if (values.size > 0) next.set(key, [...values].join(','));
      else next.delete(key);
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      FILTER_PARAMS.forEach(key => next.delete(key));
      next.delete('page');
      return next;
    }, { replace: true });
  };

  const hasActiveFilters = statusFilters.size > 0 || forkFilters.size > 0 || categoryFilters.size > 0 || stageFilters.size > 0 || layerFilters.size > 0 || headlinerFilters.size > 0;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedEips.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const paginatedEips = filteredAndSortedEips.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Paging is a navigation, so it pushes a history entry rather than replacing.
  const goToPage = (page: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (page <= 1) next.delete('page');
      else next.set('page', String(page));
      return next;
    });
  };

  // Lock body scroll when filters modal is open
  React.useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileFiltersOpen]);

  // Helper to get fork upgrade path (null for forks without a public page).


  // Helper to get proper fork display name with accents
  const getForkDisplayName = (forkName: string): string => {
    const displayMap: Record<string, string> = {
      'Hegota': 'Hegotá'
    };
    return displayMap[forkName] || forkName;
  };

  // Fork color helper - warm color palette
  const getForkColor = (forkName: string) => {
    // Look up the fork in networkUpgrades to get its status
    const upgrade = networkUpgrades.find(u => u.name.includes(forkName) || u.id === forkName.toLowerCase());

    if (!upgrade) {
      // Default gray for unknown forks - with border
      return 'bg-slate-50/50 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50';
    }

    // Color based on upgrade status - using borders and lighter backgrounds to differentiate from stages
    switch (upgrade.status) {
      case 'Live':
        // Green for live forks - with border
        return 'bg-emerald-50/50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50';
      case 'Upcoming':
        // Blue for upcoming forks - with border
        return 'bg-blue-50/50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50';
      case 'Planning':
        // Purple for planning forks - with border
        return 'bg-purple-50/50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50';
      default:
        return 'bg-slate-50/50 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50';
    }
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    const direction: SortDirection = sortField === field
      ? (sortDirection === 'asc' ? 'desc' : 'asc')
      : defaultSortDirection(field);

    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (field === DEFAULT_SORT_FIELD) next.delete('sort');
      else next.set('sort', field);
      if (direction === defaultSortDirection(field)) next.delete('dir');
      else next.set('dir', direction);
      next.delete('page');
      return next;
    }, { replace: true });
  };

  // Helper to format date as YYYY-MM-DD
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Stage color helper
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Considered for Inclusion':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50';
      case 'Proposed for Inclusion':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50';
      case 'Scheduled for Inclusion':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50';
      case 'Included':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50';
      case 'Declined for Inclusion':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              EIP Directory
            </h1>
            <div className="flex items-center gap-3">
              <EipSearch onOpen={() => openGlobalSearch({ scope: 'eips' })} />
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  hasActiveFilters
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className="px-1.5 py-0.5 text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                    {statusFilters.size + forkFilters.size + categoryFilters.size + stageFilters.size + layerFilters.size + headlinerFilters.size}
                  </span>
                )}
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">
                {filteredAndSortedEips.length} {filteredAndSortedEips.length === 1 ? 'EIP' : 'EIPs'}
              </span>
            </div>
          </div>
        </div>

        {/* Filters Modal/Sheet */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 animate-fadeIn">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileFiltersOpen(false)}
            />
            {/* Modal */}
            <div className="md:absolute md:inset-0 md:flex md:items-center md:justify-center absolute bottom-0 left-0 right-0">
              <div className="bg-white dark:bg-slate-800 md:rounded-2xl rounded-t-2xl md:max-w-3xl md:w-full max-h-[85vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-fade-scale md:shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Filters</h2>
                  <div className="flex items-center gap-3">
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-purple-600 dark:text-purple-400 font-medium"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      onClick={() => setMobileFiltersOpen(false)}
                      className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

              {/* Filter Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Upgrade Filter */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Upgrade</h3>
                    <div className="flex flex-wrap gap-2">
                      {forksWithNone.map(fork => {
                        const isSelected = forkFilters.has(fork);
                        const forkColor = fork !== 'No Fork' ? getForkColor(fork) : '';
                        const displayName = fork !== 'No Fork' ? getForkDisplayName(fork) : fork;
                        return (
                          <button
                            key={fork}
                            onClick={() => toggleFilter('upgrade', fork)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              isSelected
                                ? 'ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                                : ''
                            } ${fork !== 'No Fork' ? forkColor : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                          >
                            {displayName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage Filter */}
                  {stages.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Stage</h3>
                      <div className="flex flex-wrap gap-2">
                        {stages.map(stage => {
                          const isSelected = stageFilters.has(stage);
                          const label = STAGE_SHORT_NAMES[stage] ?? stage;
                          const stageColor = getStageColor(stage);
                          return (
                            <button
                              key={stage}
                              onClick={() => toggleFilter('stage', stage)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${stageColor} ${
                                isSelected
                                  ? 'ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                                  : ''
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Status Filter */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Status</h3>
                    <div className="flex flex-wrap gap-2">
                      {statuses.map(status => {
                        const isSelected = statusFilters.has(status);
                        return (
                          <button
                            key={status}
                            onClick={() => toggleFilter('status', status)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              isSelected
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Type/Category Filter */}
                  {categories.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Type</h3>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(category => {
                          const isSelected = categoryFilters.has(category);
                          return (
                            <button
                              key={category}
                              onClick={() => toggleFilter('type', category)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {category}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Layer Filter */}
                  {layers.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Layer</h3>
                      <div className="flex flex-wrap gap-2">
                        {layers.map(layer => {
                          const isSelected = layerFilters.has(layer);
                          const layerColor = layer === 'EL'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600 hover:bg-indigo-200 dark:hover:bg-indigo-900/30'
                            : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 border border-teal-200 dark:border-teal-600 hover:bg-teal-200 dark:hover:bg-teal-900/30';
                          return (
                            <button
                              key={layer}
                              onClick={() => toggleFilter('layer', layer)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${layerColor} ${
                                isSelected
                                  ? 'ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                                  : ''
                              }`}
                            >
                              {layer}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Headliner Filter */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Headliner</h3>
                    <div className="flex flex-wrap gap-2">
                      <Tooltip text="Selected headliner for an upgrade">
                        <button
                          onClick={() => toggleFilter('headliner', 'Selected')}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            headlinerFilters.has('Selected')
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Selected ★
                        </button>
                      </Tooltip>
                      <Tooltip text="Proposed headliner (not selected)">
                        <button
                          onClick={() => toggleFilter('headliner', 'Proposed')}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            headlinerFilters.has('Proposed')
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Proposed ☆
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                >
                  Show {filteredAndSortedEips.length} {filteredAndSortedEips.length === 1 ? 'result' : 'results'}
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Table - Desktop */}
        <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('number')}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      EIP #
                      {sortField === 'number' && (
                        <span className="text-purple-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('status')}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      Status
                      {sortField === 'status' && (
                        <span className="text-purple-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Upgrade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Layer
                  </th>
                  <th className="px-2 py-3 text-center">
                    <Tooltip text="Headliner status: ★ = selected, ☆ = proposed">
                      <button
                        onClick={() => handleSort('headliner')}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-help"
                      >
                        ★
                        {sortField === 'headliner' && (
                          <span className="text-purple-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </Tooltip>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('updated')}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      Updated
                      {sortField === 'updated' && (
                        <span className="text-purple-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('date')}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      Created
                      {sortField === 'date' && (
                        <span className="text-purple-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {paginatedEips.map(eip => {
                  const title = getLaymanTitle(eip);
                  const isTitleLong = title.length > 60;

                  return (
                    <tr
                      key={eip.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          to={`/eips/${eip.id}`}
                          className="text-sm font-mono font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                        >
                          {getProposalPrefix(eip)}-{eip.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {isTitleLong ? (
                          <Tooltip text={title}>
                            <Link
                              to={`/eips/${eip.id}`}
                              className="text-sm text-slate-900 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400 line-clamp-2 transition-colors"
                            >
                              {title}
                            </Link>
                          </Tooltip>
                        ) : (
                          <Link
                            to={`/eips/${eip.id}`}
                            className="text-sm text-slate-900 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          >
                            {title}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-xs font-medium rounded ring-1 ring-slate-200 dark:ring-slate-500 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {eip.status}
                        </span>
                      </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {eip.forkRelationships.length > 0 ? (
                          [...eip.forkRelationships].reverse().map((fork) => (
                            <UpgradeStageBadge
                              key={fork.forkName}
                              forkName={fork.forkName}
                              stage={getInclusionStage(eip, fork.forkName)}
                            />
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          const layer = getEipLayer(eip);
                          if (!layer) return <span className="text-xs text-slate-400 dark:text-slate-400">—</span>;
                          return (
                            <Tooltip text={layer === 'EL' ? 'Primarily impacts Execution Layer' : 'Primarily impacts Consensus Layer'}>
                              <span
                                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                                  layer === 'EL'
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600'
                                    : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 border border-teal-200 dark:border-teal-600'
                                }`}
                              >
                                {layer}
                              </span>
                            </Tooltip>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {isHeadlinerInAnyFork(eip) ? (
                          <span className="text-slate-700 dark:text-slate-300" title="Selected headliner">★</span>
                        ) : wasHeadlinerCandidateInAnyFork(eip) ? (
                          <span className="text-slate-400 dark:text-slate-400" title="Proposed headliner">☆</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {eip.forkRelationships.length > 0 ? (
                          (() => {
                            // Get the most recent fork and its last status change date
                            const mostRecentFork = eip.forkRelationships[eip.forkRelationships.length - 1];
                            // Find the most recent status with a date
                            const statusWithDate = [...mostRecentFork.statusHistory]
                              .reverse()
                              .find(status => status.date);

                            return statusWithDate?.date ? (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {formatDate(statusWithDate.date)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-400">—</span>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(eip.createdDate)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card List - Mobile */}
        <div className="md:hidden space-y-3">
          {paginatedEips.map(eip => {
            const layer = getEipLayer(eip);
            const latestFork = eip.forkRelationships.length > 0
              ? eip.forkRelationships[eip.forkRelationships.length - 1]
              : null;
            const statusWithDate = latestFork
              ? [...latestFork.statusHistory].reverse().find(status => status.date)
              : null;

            return (
              <Link
                key={eip.id}
                to={`/eips/${eip.id}`}
                className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-slate-700/20 transition-all hover:border-purple-300 dark:hover:border-purple-600"
              >
                {/* Header: EIP number and badges */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-base font-mono font-semibold text-purple-600 dark:text-purple-400">
                    {getProposalPrefix(eip)}-{eip.id}
                    {isHeadlinerInAnyFork(eip) && (
                      <span className="ml-1.5 text-slate-700 dark:text-slate-300" title="Selected headliner">★</span>
                    )}
                    {wasHeadlinerCandidateInAnyFork(eip) && (
                      <span className="ml-1.5 text-slate-400 dark:text-slate-400" title="Proposed headliner">☆</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {layer && (
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          layer === 'EL'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600'
                            : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 border border-teal-200 dark:border-teal-600'
                        }`}
                      >
                        {layer}
                      </span>
                    )}
                    {eip.forkRelationships.map((fork) => (
                      <UpgradeStageBadge
                        key={fork.forkName}
                        forkName={fork.forkName}
                        stage={getInclusionStage(eip, fork.forkName)}
                      />
                    ))}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-2 leading-snug">
                  {getLaymanTitle(eip)}
                </h3>

                {/* Dates */}
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {statusWithDate?.date && (
                    <span>Updated {formatDate(statusWithDate.date)}</span>
                  )}
                  <span className="text-slate-400 dark:text-slate-400">
                    Created {formatDate(eip.createdDate)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Empty State */}
        {filteredAndSortedEips.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No EIPs match the selected filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EipsIndexPage;
