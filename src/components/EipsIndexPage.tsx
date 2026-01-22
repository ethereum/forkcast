import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './ui/Logo';
import ThemeToggle from './ui/ThemeToggle';
import { eipsData } from '../data/eips';
import { getProposalPrefix, getLaymanTitle, getInclusionStage, isHeadlinerInAnyFork, wasHeadlinerCandidateInAnyFork } from '../utils/eip';
import { EipSearch } from './eip/EipSearch';
import EipSearchModal from './eip/EipSearchModal';
import { Tooltip } from './ui';
import { networkUpgrades } from '../data/upgrades';

type SortField = 'number' | 'date' | 'status' | 'updated' | 'headliner';
type SortDirection = 'asc' | 'desc';

const EipsIndexPage: React.FC = () => {
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [forkFilters, setForkFilters] = useState<Set<string>>(new Set());
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [stageFilters, setStageFilters] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('updated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Global keyboard shortcut for search (Cmd/Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Extract unique values for filters
  const { statuses, forks, categories, stages } = useMemo(() => {
    const statusSet = new Set<string>();
    const forkSet = new Set<string>();
    const categorySet = new Set<string>();
    const stageSet = new Set<string>();

    eipsData.forEach(eip => {
      if (eip.status) statusSet.add(eip.status);
      // Add category or type since we display category || type
      const typeValue = eip.category || eip.type;
      if (typeValue) categorySet.add(typeValue);

      eip.forkRelationships.forEach(fork => {
        forkSet.add(fork.forkName);

        // Get inclusion stage for this fork
        const stage = getInclusionStage(eip, fork.forkName);
        if (stage && stage !== 'Unknown') {
          stageSet.add(stage);
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
      'Withdrawn'
    ];
    const sortedStages = Array.from(stageSet).sort((a, b) => {
      const indexA = stageOrder.indexOf(a);
      const indexB = stageOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    return {
      statuses: Array.from(statusSet).sort(),
      forks: sortedForks,
      categories: Array.from(categorySet).sort(),
      stages: sortedStages,
    };
  }, []);

  // Add "No Fork" to forks list
  const forksWithNone = [...forks, 'No Fork'];

  // Filter and sort EIPs
  const filteredAndSortedEips = useMemo(() => {
    let filtered = eipsData;

    // Apply status filter
    if (statusFilters.size > 0) {
      filtered = filtered.filter(eip => statusFilters.has(eip.status));
    }

    // Apply fork filter
    if (forkFilters.size > 0) {
      filtered = filtered.filter(eip => {
        if (forkFilters.has('No Fork')) {
          // Include EIPs with no fork relationships
          if (eip.forkRelationships.length === 0) return true;
        }
        // Check if EIP has any of the selected forks
        return eip.forkRelationships.some(fork => forkFilters.has(fork.forkName));
      });
    }

    // Apply category filter
    if (categoryFilters.size > 0) {
      filtered = filtered.filter(eip => {
        const typeValue = eip.category || eip.type;
        return typeValue && categoryFilters.has(typeValue);
      });
    }

    // Apply stage filter
    if (stageFilters.size > 0) {
      filtered = filtered.filter(eip => {
        // Check if EIP has any fork with the selected stage
        return eip.forkRelationships.some(fork => {
          const stage = getInclusionStage(eip, fork.forkName);
          return stageFilters.has(stage);
        });
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
  }, [statusFilters, forkFilters, categoryFilters, stageFilters, sortField, sortDirection]);

  // Toggle filter
  const toggleFilter = (filterSet: Set<string>, setFilterSet: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    const newSet = new Set(filterSet);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setFilterSet(newSet);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilters(new Set());
    setForkFilters(new Set());
    setCategoryFilters(new Set());
    setStageFilters(new Set());
  };

  const hasActiveFilters = statusFilters.size > 0 || forkFilters.size > 0 || categoryFilters.size > 0 || stageFilters.size > 0;

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

  // Helper to get fork upgrade path
  const getForkPath = (forkName: string): string | null => {
    const forkMap: Record<string, string> = {
      'Shapella': '/upgrade/shapella',
      'Dencun': '/upgrade/dencun',
      'Pectra': '/upgrade/pectra',
      'Fusaka': '/upgrade/fusaka',
      'Glamsterdam': '/upgrade/glamsterdam',
      'Hegota': '/upgrade/hegota'
    };
    return forkMap[forkName] || null;
  };

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
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default to descending for number and dates, ascending for others
      setSortDirection((field === 'number' || field === 'date' || field === 'updated') ? 'desc' : 'asc');
    }
  };

  // Helper to format date as YYYY-MM-DD
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to get stage label
  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'Considered for Inclusion': return 'Considered';
      case 'Proposed for Inclusion': return 'Proposed';
      case 'Scheduled for Inclusion': return 'Scheduled';
      case 'Declined for Inclusion': return 'Declined';
      case 'Included': return 'Included';
      case 'Withdrawn': return 'Withdrawn';
      default: return null;
    }
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
      case 'Withdrawn':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <Logo size="md" className="mb-4" />
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              EIP Directory
            </h1>
            <div className="flex items-center gap-3">
              <EipSearch onOpen={() => setSearchModalOpen(true)} />
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
                    {statusFilters.size + forkFilters.size + categoryFilters.size + stageFilters.size}
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
                            onClick={() => toggleFilter(forkFilters, setForkFilters, fork)}
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
                          const label = getStageLabel(stage);
                          const stageColor = getStageColor(stage);
                          return (
                            <button
                              key={stage}
                              onClick={() => toggleFilter(stageFilters, setStageFilters, stage)}
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
                            onClick={() => toggleFilter(statusFilters, setStatusFilters, status)}
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
                              onClick={() => toggleFilter(categoryFilters, setCategoryFilters, category)}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Stage
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
                {filteredAndSortedEips.map(eip => {
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
                        <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {eip.status}
                        </span>
                      </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {eip.forkRelationships.length > 0 ? (
                          // Display forks in reverse order (newest first)
                          [...eip.forkRelationships].reverse().map((fork, idx) => {
                            const forkPath = getForkPath(fork.forkName);
                            const forkColor = getForkColor(fork.forkName);
                            const displayName = getForkDisplayName(fork.forkName);
                            return forkPath ? (
                              <Link
                                key={idx}
                                to={forkPath}
                                onClick={(e) => e.stopPropagation()}
                                className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors ${forkColor}`}
                              >
                                {displayName}
                              </Link>
                            ) : (
                              <span
                                key={idx}
                                className={`px-1.5 py-0.5 text-xs font-medium rounded ${forkColor}`}
                              >
                                {displayName}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                      <td className="px-2 py-3 text-center">
                        {isHeadlinerInAnyFork(eip) ? (
                          <span className="text-slate-700 dark:text-slate-300" title="Selected headliner">★</span>
                        ) : wasHeadlinerCandidateInAnyFork(eip) ? (
                          <span className="text-slate-400 dark:text-slate-500" title="Proposed headliner">☆</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {eip.forkRelationships.length > 0 ? (
                          (() => {
                            // Get the most recent fork (last in array)
                            const mostRecentFork = eip.forkRelationships[eip.forkRelationships.length - 1];
                            const stage = getInclusionStage(eip, mostRecentFork.forkName);
                            const label = getStageLabel(stage);
                            const stageColor = getStageColor(stage);
                            return label ? (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${stageColor}`}>
                                {label}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
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
                              <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
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
          {filteredAndSortedEips.map(eip => {
            const mostRecentFork = eip.forkRelationships.length > 0
              ? eip.forkRelationships[eip.forkRelationships.length - 1]
              : null;
            const currentStage = mostRecentFork ? getInclusionStage(eip, mostRecentFork.forkName) : null;
            const stageLabel = currentStage ? getStageLabel(currentStage) : null;
            const stageColor = currentStage ? getStageColor(currentStage) : '';
            const mostRecentForkColor = mostRecentFork ? getForkColor(mostRecentFork.forkName) : '';
            const mostRecentForkDisplay = mostRecentFork ? getForkDisplayName(mostRecentFork.forkName) : '';
            const statusWithDate = mostRecentFork
              ? [...mostRecentFork.statusHistory].reverse().find(status => status.date)
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
                      <span className="ml-1.5 text-slate-400 dark:text-slate-500" title="Proposed headliner">☆</span>
                    )}
                  </span>
                  {/* Fork and Stage grouped together side-by-side */}
                  {mostRecentFork && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${mostRecentForkColor}`}>
                        {mostRecentForkDisplay}
                      </span>
                      {stageLabel && (
                        <span className={`px-2 py-1 text-xs font-medium rounded ${stageColor}`}>
                          {stageLabel}
                        </span>
                      )}
                    </div>
                  )}
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
                  <span className="text-slate-400 dark:text-slate-500">
                    Created {formatDate(eip.createdDate)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAndSortedEips.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No EIPs match the selected filters.
            </p>
          </div>
        )}
      </div>

      {/* Search Modal */}
      <EipSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </div>
  );
};

export default EipsIndexPage;

