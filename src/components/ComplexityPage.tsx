import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { eipsData } from '../data/eips';
import { networkUpgrades } from '../data/upgrades';
import { useComplexityData, getComplexityForEip } from '../hooks/useComplexityData';
import { getComplexityTierColor, getComplexityTierEmoji } from '../utils/complexity';
import { getInclusionStage, getLaymanTitle, getProposalPrefix, getSpecificationUrl } from '../utils';
import { getInclusionStageColor } from '../utils/colors';
import { InclusionStage } from '../types';
import { useMetaTags } from '../hooks/useMetaTags';
import ThemeToggle from './ui/ThemeToggle';
import { ComplexityTier } from '../types';

type SortField = 'eip' | 'complexity' | 'tier' | 'stage';
type SortDirection = 'asc' | 'desc';
type FilterTier = 'all' | 'Low' | 'Medium' | 'High' | 'unassessed';

const ComplexityPage: React.FC = () => {
  const [selectedFork, setSelectedFork] = useState('glamsterdam');
  const [sortField, setSortField] = useState<SortField>('complexity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterTier, setFilterTier] = useState<FilterTier>('all');
  const [hideExcluded, setHideExcluded] = useState(true);
  const [expandedEip, setExpandedEip] = useState<number | null>(null);

  const { complexityMap, loading, error, refetch } = useComplexityData();

  useMetaTags({
    title: 'EIP Test Complexity Analysis - Forkcast',
    description: 'Analyze EIP complexity scores from the STEEL team to help plan network upgrade contents.',
    url: 'https://forkcast.org/complexity',
  });

  // Get available forks (non-disabled, non-Live except special cases)
  const availableForks = useMemo(() => {
    return networkUpgrades.filter(
      (u) => !u.disabled && ['Upcoming', 'Planning', 'Research'].includes(u.status)
    );
  }, []);

  // Get EIPs for selected fork
  const forkEips = useMemo(() => {
    return eipsData.filter((eip) =>
      eip.forkRelationships.some(
        (rel) => rel.forkName.toLowerCase() === selectedFork.toLowerCase()
      )
    );
  }, [selectedFork]);

  // Combine EIPs with complexity data
  const eipsWithComplexity = useMemo(() => {
    return forkEips.map((eip) => ({
      eip,
      complexity: getComplexityForEip(complexityMap, eip.id),
    }));
  }, [forkEips, complexityMap]);

  // Apply filtering
  const filteredEips = useMemo(() => {
    let result = eipsWithComplexity;

    // Filter out declined/withdrawn/unknown if hideExcluded is true
    if (hideExcluded) {
      result = result.filter((e) => {
        const stage = getInclusionStage(e.eip, selectedFork);
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
  }, [eipsWithComplexity, filterTier, hideExcluded, selectedFork]);

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
          const stageA = getInclusionStage(a.eip, selectedFork);
          const stageB = getInclusionStage(b.eip, selectedFork);
          comparison = (stageOrder[stageA] || 99) - (stageOrder[stageB] || 99);
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredEips, sortField, sortDirection, selectedFork]);

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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <Link
            to="/"
            className="text-2xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight inline-block mb-4"
          >
            Forkcast
          </Link>
          <div className="flex items-center justify-between gap-4 mb-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Test Complexity Analysis
            </h1>
            <a
              href="https://github.com/ethsteel/pm/tree/main/complexity_assessments/EIPs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 flex items-center gap-1"
            >
              STEEL data
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Scores based on 24 anchors. Tiers:
            <span className="text-emerald-600 dark:text-emerald-400"> Low &lt;10</span>,
            <span className="text-amber-600 dark:text-amber-400"> Medium 10-19</span>,
            <span className="text-red-600 dark:text-red-400"> High &ge;20</span>
          </p>
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Scores reflect testing effort, not implementation complexity. Early estimations subject to change.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* Fork selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Fork:</span>
              <select
                id="fork-select"
                value={selectedFork}
                onChange={(e) => setSelectedFork(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {availableForks.map((fork) => (
                  <option key={fork.id} value={fork.id}>
                    {fork.name.replace(' Upgrade', '')}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-600" />

            {/* Tier filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Tier:</span>
              <select
                id="tier-filter"
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value as FilterTier)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="unassessed">Not Assessed</option>
              </select>
            </div>

            <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-600" />

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
            sortedEips.map(({ eip, complexity }) => {
              const stage = getInclusionStage(eip, selectedFork) as InclusionStage;
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
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-purple-600 dark:text-purple-400">
                            {getProposalPrefix(eip)}-{eip.id}
                          </span>
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
                sortedEips.map(({ eip, complexity }) => (
                  <React.Fragment key={eip.id}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <a
                          href={getSpecificationUrl(eip)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                        >
                          {getProposalPrefix(eip)}-{eip.id}
                        </a>
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
                          const stage = getInclusionStage(eip, selectedFork) as InclusionStage;
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
