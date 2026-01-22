import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { eipsData } from '../data/eips';
import { useComplexityData, getComplexityForEip } from '../hooks/useComplexityData';
import { getComplexityTierColor, getComplexityTierEmoji } from '../utils/complexity';
import { getInclusionStage, getLaymanTitle, getProposalPrefix, getSpecificationUrl } from '../utils';
import { getInclusionStageColor } from '../utils/colors';
import { InclusionStage } from '../types';
import { useMetaTags } from '../hooks/useMetaTags';
import ThemeToggle from './ui/ThemeToggle';
import AnalysisNav from './ui/AnalysisNav';
import { ComplexityTier } from '../types';

type SortField = 'eip' | 'complexity' | 'tier' | 'stage';
type SortDirection = 'asc' | 'desc';
type FilterTier = 'all' | 'Low' | 'Medium' | 'High' | 'unassessed';

const SELECTED_FORK = 'glamsterdam';

const ComplexityPage: React.FC = () => {
  const [sortField, setSortField] = useState<SortField>('complexity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterTier, setFilterTier] = useState<FilterTier>('all');
  const [hideExcluded, setHideExcluded] = useState(true);
  const [expandedEip, setExpandedEip] = useState<number | null>(null);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);

  const { complexityMap, loading, error, refetch } = useComplexityData();

  // Lock body scroll when filters modal is open
  useEffect(() => {
    if (filtersModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [filtersModalOpen]);

  // Count active filters
  const activeFilterCount = filterTier !== 'all' ? 1 : 0;

  const clearFilters = () => {
    setFilterTier('all');
  };

  useMetaTags({
    title: 'EIP Test Complexity Analysis - Forkcast',
    description: 'Analyze EIP complexity scores from the STEEL team to help plan network upgrade contents.',
    url: 'https://forkcast.org/complexity',
  });

  // Get EIPs for selected fork with layer info
  const forkEips = useMemo(() => {
    return eipsData
      .filter((eip) =>
        eip.forkRelationships.some(
          (rel) => rel.forkName.toLowerCase() === SELECTED_FORK.toLowerCase()
        )
      )
      .map((eip) => ({
        eip,
        layer: eip.layer,
      }));
  }, []);

  // Combine EIPs with complexity data
  const eipsWithComplexity = useMemo(() => {
    return forkEips.map(({ eip, layer }) => ({
      eip,
      layer,
      complexity: getComplexityForEip(complexityMap, eip.id),
    }));
  }, [forkEips, complexityMap]);

  // Apply filtering
  const filteredEips = useMemo(() => {
    let result = eipsWithComplexity;

    // Filter out declined/withdrawn/unknown if hideExcluded is true
    if (hideExcluded) {
      result = result.filter((e) => {
        const stage = getInclusionStage(e.eip, SELECTED_FORK);
        return stage !== 'Declined for Inclusion' && stage !== 'Withdrawn' && stage !== 'Unknown';
      });
    }

    // Apply tier filter
    if (filterTier === 'unassessed') {
      return result.filter((e) => !e.complexity);
    }
    if (filterTier !== 'all') {
      return result.filter((e) => e.complexity?.tier === filterTier);
    }

    return result;
  }, [eipsWithComplexity, filterTier, hideExcluded]);

  // Apply sorting
  const sortedEips = useMemo(() => {
    return [...filteredEips].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'eip':
          comparison = a.eip.id - b.eip.id;
          break;
        case 'complexity':
          // Unassessed always goes last regardless of sort direction
          if (!a.complexity && !b.complexity) return 0;
          if (!a.complexity) return 1;
          if (!b.complexity) return -1;
          comparison = a.complexity.totalScore - b.complexity.totalScore;
          break;
        case 'tier': {
          // Unassessed always goes last regardless of sort direction
          if (!a.complexity && !b.complexity) return 0;
          if (!a.complexity) return 1;
          if (!b.complexity) return -1;
          const tierOrder: Record<ComplexityTier, number> = {
            Low: 1,
            Medium: 2,
            High: 3,
          };
          comparison = tierOrder[a.complexity.tier] - tierOrder[b.complexity.tier];
          break;
        }
        case 'stage': {
          const stageOrder: Record<string, number> = {
            'Included': 1,
            'Scheduled for Inclusion': 2,
            'Considered for Inclusion': 3,
            'Proposed for Inclusion': 4,
            'Declined for Inclusion': 5,
            'Withdrawn': 6,
            'Unknown': 7,
          };
          const stageA = getInclusionStage(a.eip, SELECTED_FORK);
          const stageB = getInclusionStage(b.eip, SELECTED_FORK);
          comparison = (stageOrder[stageA] || 99) - (stageOrder[stageB] || 99);
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredEips, sortField, sortDirection]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const assessed = eipsWithComplexity.filter((e) => e.complexity);
    const unassessed = eipsWithComplexity.filter((e) => !e.complexity);

    const tierCounts = { Low: 0, Medium: 0, High: 0 };
    let totalScore = 0;

    for (const item of assessed) {
      if (item.complexity) {
        tierCounts[item.complexity.tier]++;
        totalScore += item.complexity.totalScore;
      }
    }

    return {
      total: eipsWithComplexity.length,
      assessed: assessed.length,
      unassessed: unassessed.length,
      tierCounts,
      totalScore,
      avgScore: assessed.length > 0 ? totalScore / assessed.length : 0,
    };
  }, [eipsWithComplexity]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
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
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Test Complexity Analysis
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
              Glamsterdam
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Scores based on 24 anchors from{' '}
            <a
              href="https://github.com/ethsteel/pm/tree/main/complexity_assessments/EIPs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline"
            >
              STEEL
            </a>
            . Tiers:
            <span className="text-emerald-600 dark:text-emerald-400"> Low &lt;10</span>,
            <span className="text-amber-600 dark:text-amber-400"> Medium 10-19</span>,
            <span className="text-red-600 dark:text-red-400"> High &ge;20</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Scores reflect testing effort, not implementation complexity. Early estimations subject to change.
          </p>
          <div className="mt-4">
            <AnalysisNav />
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {/* Filters button */}
            <button
              onClick={() => setFiltersModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                activeFilterCount > 0
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Active only toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideExcluded}
                onChange={(e) => setHideExcluded(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">Active only</span>
            </label>

            {/* Stats summary - inline */}
            <div className="flex items-center gap-4 ml-auto text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {sortedEips.length} EIPs
              </span>
              {stats.assessed > 0 && (
                <>
                  <div className="hidden md:flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-slate-600 dark:text-slate-300">{stats.tierCounts.Low}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span className="text-slate-600 dark:text-slate-300">{stats.tierCounts.Medium}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-slate-600 dark:text-slate-300">{stats.tierCounts.High}</span>
                    </span>
                  </div>
                  <span className="hidden lg:inline text-slate-400 dark:text-slate-500">|</span>
                  <span className="hidden lg:inline text-purple-600 dark:text-purple-400 font-medium">
                    {stats.totalScore} pts
                  </span>
                </>
              )}
              <button
                onClick={refetch}
                disabled={loading}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Modal */}
        {filtersModalOpen && (
          <div className="fixed inset-0 z-50 animate-fadeIn">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setFiltersModalOpen(false)}
            />
            {/* Modal */}
            <div className="md:absolute md:inset-0 md:flex md:items-center md:justify-center absolute bottom-0 left-0 right-0">
              <div className="bg-white dark:bg-slate-800 md:rounded-2xl rounded-t-2xl md:max-w-lg md:w-full max-h-[85vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-fade-scale md:shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Filters</h2>
                  <div className="flex items-center gap-3">
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="text-sm text-purple-600 dark:text-purple-400 font-medium"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      onClick={() => setFiltersModalOpen(false)}
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
                  {/* Tier Filter */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Complexity Tier</h3>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: 'all', label: 'All Tiers', color: null },
                        { value: 'Low', label: 'Low (<10)', color: 'emerald' },
                        { value: 'Medium', label: 'Medium (10-19)', color: 'amber' },
                        { value: 'High', label: 'High (≥20)', color: 'red' },
                        { value: 'unassessed', label: 'Not Assessed', color: null },
                      ] as const).map(({ value, label, color }) => {
                        const isSelected = filterTier === value;
                        return (
                          <button
                            key={value}
                            onClick={() => setFilterTier(value)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              isSelected
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                          >
                            {color && (
                              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 bg-${color}-500`}></span>
                            )}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <button
                    onClick={() => setFiltersModalOpen(false)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Show {sortedEips.length} {sortedEips.length === 1 ? 'result' : 'results'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <p className="text-red-700 dark:text-red-300 text-sm">
              Error loading complexity data: {error.message}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && complexityMap.size === 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-12 text-center">
            <svg className="w-8 h-8 mx-auto mb-3 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-600 dark:text-slate-300 font-medium">Loading complexity data...</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Fetching assessments from STEEL repository</p>
          </div>
        )}

        {/* Mobile Card List */}
        {(!loading || complexityMap.size > 0) && (
        <div className="md:hidden space-y-2">
          {sortedEips.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center text-slate-500 dark:text-slate-400">
              No EIPs found for this fork
            </div>
          ) : (
            sortedEips.map(({ eip, layer, complexity }) => {
              const stage = getInclusionStage(eip, SELECTED_FORK) as InclusionStage;
              const shortStage = stage.replace(' for Inclusion', '');
              const isExpanded = expandedEip === eip.id;

              return (
                <div
                  key={eip.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => complexity && setExpandedEip(isExpanded ? null : eip.id)}
                    className="w-full px-4 py-3 text-left"
                    disabled={!complexity}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-sm text-purple-600 dark:text-purple-400">
                            {getProposalPrefix(eip)}-{eip.id}
                          </span>
                          {layer && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                              layer === 'EL'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300'
                            }`}>
                              {layer}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${getInclusionStageColor(stage)}`}>
                            {shortStage}
                          </span>
                        </div>
                        <p className="text-sm text-slate-900 dark:text-slate-100 truncate">
                          {getLaymanTitle(eip)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {complexity ? (
                          <>
                            <div className="text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${getComplexityTierColor(complexity.tier)}`}>
                                {getComplexityTierEmoji(complexity.tier)} {complexity.totalScore}
                              </span>
                            </div>
                            <svg
                              className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                            Not assessed
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded anchor details */}
                  {isExpanded && complexity && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {complexity.anchors.filter((a) => a.score > 0).length}/{complexity.anchors.length} anchors scored
                        </span>
                        <a
                          href={complexity.assessmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-600 dark:text-purple-400"
                        >
                          View full assessment
                        </a>
                      </div>
                      <div className="space-y-1">
                        {complexity.anchors.filter(a => a.score > 0).map((anchor, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1">
                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate pr-2">
                              {anchor.name}
                            </span>
                            {anchor.score <= 3 ? (
                              <div className="flex gap-0.5 shrink-0">
                                {[1, 2, 3].map((level) => (
                                  <div
                                    key={level}
                                    className={`w-2 h-2 rounded-sm ${
                                      anchor.score >= level
                                        ? level === 1 ? 'bg-amber-400' : level === 2 ? 'bg-orange-500' : 'bg-red-500'
                                        : 'bg-slate-200 dark:bg-slate-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center justify-center px-1.5 h-4 text-[10px] font-semibold text-red-600 dark:text-red-100 bg-red-200/60 dark:bg-red-600/40 rounded">
                                {anchor.score}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        )}

        {/* Desktop Table */}
        {(!loading || complexityMap.size > 0) && (
        <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                  onClick={() => handleSort('eip')}
                >
                  <div className="flex items-center gap-2">
                    EIP
                    <SortIcon field="eip" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                  Title
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                  onClick={() => handleSort('stage')}
                >
                  <div className="flex items-center gap-2">
                    Stage
                    <SortIcon field="stage" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                  onClick={() => handleSort('tier')}
                >
                  <div className="flex items-center gap-2">
                    Tier
                    <SortIcon field="tier" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                  onClick={() => handleSort('complexity')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Score
                    <SortIcon field="complexity" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading && sortedEips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    Loading complexity data...
                  </td>
                </tr>
              ) : sortedEips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No EIPs found for this fork
                  </td>
                </tr>
              ) : (
                sortedEips.map(({ eip, layer, complexity }) => (
                  <React.Fragment key={eip.id}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a
                            href={getSpecificationUrl(eip)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            {getProposalPrefix(eip)}-{eip.id}
                          </a>
                          {layer && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                              layer === 'EL'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                            }`}>
                              {layer}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/eips/${eip.id}`}
                          className="text-sm text-slate-900 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400"
                        >
                          {getLaymanTitle(eip)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const stage = getInclusionStage(eip, SELECTED_FORK) as InclusionStage;
                          const shortStage = stage.replace(' for Inclusion', '');
                          return (
                            <span className={`inline-block px-2 py-0.5 text-xs rounded ${getInclusionStageColor(stage)}`}>
                              {shortStage}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {complexity ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${getComplexityTierColor(complexity.tier)}`}
                          >
                            {getComplexityTierEmoji(complexity.tier)} {complexity.tier}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                            Not assessed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {complexity ? (
                          <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                            {complexity.totalScore}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {complexity ? (
                          <button
                            onClick={() => setExpandedEip(expandedEip === eip.id ? null : eip.id)}
                            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                            aria-label={expandedEip === eip.id ? 'Collapse details' : 'Expand details'}
                          >
                            <svg
                              className={`w-5 h-5 transition-transform ${expandedEip === eip.id ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                    {/* Expanded Details Row */}
                    {expandedEip === eip.id && complexity && (
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  Anchor Scores
                                </h4>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {complexity.anchors.filter((a) => a.score > 0).length} of {complexity.anchors.length} anchors scored
                                </span>
                              </div>
                              <a
                                href={complexity.assessmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1"
                              >
                                Full assessment
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
                              {complexity.anchors.map((anchor, idx) => (
                                <div key={idx} className="flex items-center gap-2 py-0.5">
                                  {anchor.score <= 3 ? (
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3].map((level) => (
                                        <div
                                          key={level}
                                          className={`w-2 h-2 rounded-sm ${
                                            anchor.score >= level
                                              ? level === 1
                                                ? 'bg-amber-400'
                                                : level === 2
                                                ? 'bg-orange-500'
                                                : 'bg-red-500'
                                              : 'bg-slate-200 dark:bg-slate-600'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-[26px] h-4 text-[10px] font-semibold text-red-600 dark:text-red-100 bg-red-200/60 dark:bg-red-600/40 rounded">
                                      {anchor.score}
                                    </span>
                                  )}
                                  <span className={`text-xs truncate ${
                                    anchor.score > 0
                                      ? 'text-slate-700 dark:text-slate-200'
                                      : 'text-slate-400 dark:text-slate-500'
                                  }`}>
                                    {anchor.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>
            Complexity data sourced from the{' '}
            <a
              href="https://github.com/ethsteel/pm"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-600 dark:hover:text-slate-300"
            >
              STEEL team
            </a>
            . Assessments may not be available for all EIPs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComplexityPage;
