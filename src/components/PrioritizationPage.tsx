import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { usePrioritizationData, getELClients, getCLClients } from '../hooks/usePrioritizationData';
import {
  sortEipAggregates,
  getScoreColor,
  getRatingLabel,
  getClientInitials,
  SortField,
  SortDirection,
} from '../utils/prioritization';
import { getInclusionStageColor } from '../utils/colors';
import { getProposalPrefix, getSpecificationUrl } from '../utils';
import { eipsData } from '../data/eips';
import { InclusionStage } from '../types';
import { EipAggregateStance, ClientStance } from '../types/prioritization';
import { useMetaTags } from '../hooks/useMetaTags';
import ThemeToggle from './ui/ThemeToggle';
import AnalysisNav from './ui/AnalysisNav';

type FilterLayer = 'all' | 'EL' | 'CL';
type FilterStance = 'all' | 'support' | 'mixed' | 'oppose' | 'none';

const SELECTED_FORK = 'glamsterdam';

const PrioritizationPage: React.FC = () => {
  const [sortField, setSortField] = useState<SortField>('average');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterLayer, setFilterLayer] = useState<FilterLayer>('all');
  const [filterStance, setFilterStance] = useState<FilterStance>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [hideExcluded, setHideExcluded] = useState(true);
  const [expandedEip, setExpandedEip] = useState<number | null>(null);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);

  const { aggregates } = usePrioritizationData(SELECTED_FORK);

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

  useMetaTags({
    title: 'Client Prioritization - Forkcast',
    description: 'Aggregate view of Ethereum client team stances on CFI EIPs for network upgrades.',
    url: 'https://forkcast.org/priority',
  });

  // Apply filtering
  const filteredAggregates = useMemo(() => {
    let result = aggregates;

    // Filter out declined/withdrawn/unknown if hideExcluded is true
    if (hideExcluded) {
      result = result.filter((agg) => {
        const stage = agg.inclusionStage;
        return stage !== 'Declined for Inclusion' && stage !== 'Withdrawn' && stage !== 'Unknown';
      });
    }

    // Filter by client - only show EIPs where selected client has a stance
    if (filterClient !== 'all') {
      result = result.filter((agg) =>
        agg.stances.some((s) => s.clientName === filterClient)
      );
    }

    // Filter by layer
    if (filterLayer !== 'all') {
      result = result.filter((agg) => agg.layer === filterLayer);
    }

    // Filter by stance
    if (filterStance === 'support') {
      result = result.filter((agg) => agg.averageScore !== null && agg.averageScore >= 4);
    } else if (filterStance === 'oppose') {
      result = result.filter((agg) => agg.opposeCount > agg.supportCount);
    } else if (filterStance === 'mixed') {
      result = result.filter(
        (agg) => agg.supportCount > 0 && agg.opposeCount > 0
      );
    } else if (filterStance === 'none') {
      result = result.filter((agg) => agg.stanceCount === 0);
    }

    return result;
  }, [aggregates, filterLayer, filterStance, filterClient, hideExcluded]);

  // Apply sorting
  const sortedAggregates = useMemo(() => {
    return sortEipAggregates(filteredAggregates, sortField, sortDirection);
  }, [filteredAggregates, sortField, sortDirection]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const withStances = aggregates.filter((a) => a.stanceCount > 0);
    const avgScores = withStances
      .filter((a) => a.averageScore !== null)
      .map((a) => a.averageScore!);

    return {
      total: aggregates.length,
      withStances: withStances.length,
      avgOfAvg: avgScores.length > 0
        ? Math.round((avgScores.reduce((a, b) => a + b, 0) / avgScores.length) * 10) / 10
        : null,
      highSupport: aggregates.filter((a) => a.averageScore !== null && a.averageScore >= 4).length,
      contested: aggregates.filter((a) => a.supportCount > 0 && a.opposeCount > 0).length,
    };
  }, [aggregates]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
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

  const elClients = getELClients();
  const clClients = getCLClients();

  // Count active filters (excluding hideExcluded since it's a toggle)
  const activeFilterCount = [
    filterLayer !== 'all',
    filterClient !== 'all',
    filterStance !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterLayer('all');
    setFilterClient('all');
    setFilterStance('all');
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
              Client Prioritization
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
              Glamsterdam
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aggregate client team stances on proposed EIPs. Scores normalized to 1-5 scale.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Most perspectives were written in November 2025. Thinking and EIPs may have evolved since then.
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

            {/* Stats summary */}
            <div className="flex items-center gap-4 ml-auto text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {sortedAggregates.length} EIPs
              </span>
              {stats.withStances > 0 && (
                <div className="hidden md:flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600 dark:text-slate-300">{stats.highSupport} high</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="text-slate-600 dark:text-slate-300">{stats.contested} contested</span>
                  </span>
                </div>
              )}
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
              <div className="bg-white dark:bg-slate-800 md:rounded-2xl rounded-t-2xl md:max-w-2xl md:w-full max-h-[85vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-fade-scale md:shadow-2xl">
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
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Layer Filter */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Layer</h3>
                      <div className="flex flex-wrap gap-2">
                        {(['all', 'EL', 'CL'] as const).map((layer) => {
                          const isSelected = filterLayer === layer;
                          const label = layer === 'all' ? 'All Layers' : layer === 'EL' ? 'Execution Layer' : 'Consensus Layer';
                          return (
                            <button
                              key={layer}
                              onClick={() => setFilterLayer(layer)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stance Filter */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Stance</h3>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { value: 'all', label: 'All Stances' },
                          { value: 'support', label: 'High Support' },
                          { value: 'mixed', label: 'Contested' },
                          { value: 'oppose', label: 'More Opposition' },
                          { value: 'none', label: 'No Stances' },
                        ] as const).map(({ value, label }) => {
                          const isSelected = filterStance === value;
                          return (
                            <button
                              key={value}
                              onClick={() => setFilterStance(value)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* EL Clients Filter */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        EL Clients
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {elClients.map((client) => {
                          const isSelected = filterClient === client;
                          return (
                            <button
                              key={client}
                              onClick={() => setFilterClient(isSelected ? 'all' : client)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-800'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              {client}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* CL Clients Filter */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                        CL Clients
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {clClients.map((client) => {
                          const isSelected = filterClient === client;
                          return (
                            <button
                              key={client}
                              onClick={() => setFilterClient(isSelected ? 'all' : client)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-slate-800'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              {client}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <button
                    onClick={() => setFiltersModalOpen(false)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Show {sortedAggregates.length} {sortedAggregates.length === 1 ? 'result' : 'results'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Card List */}
        <div className="lg:hidden space-y-2">
          {sortedAggregates.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center text-slate-500 dark:text-slate-400">
              No EIPs found with prioritization data
            </div>
          ) : (
            sortedAggregates.map((agg) => {
              const eip = eipsData.find((e) => e.id === agg.eipId);
              const isExpanded = expandedEip === agg.eipId;
              const shortStage = agg.inclusionStage.replace(' for Inclusion', '');

              return (
                <div
                  key={agg.eipId}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedEip(isExpanded ? null : agg.eipId)}
                    className="w-full px-4 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-sm text-purple-600 dark:text-purple-400">
                            {eip ? getProposalPrefix(eip) : 'EIP'}-{agg.eipId}
                          </span>
                          {agg.layer && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                              agg.layer === 'EL'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                            }`}>
                              {agg.layer}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${getInclusionStageColor(agg.inclusionStage as InclusionStage)}`}>
                            {shortStage}
                          </span>
                        </div>
                        <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
                          {agg.eipTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {agg.averageScore !== null ? (
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${getScoreColor(Math.round(agg.averageScore))}`}>
                            {agg.averageScore.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                            No data
                          </span>
                        )}
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <ClientStancesGrid stances={agg.stances} elClients={elClients} clClients={clClients} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
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
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    EL Clients
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    CL Clients
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                  onClick={() => handleSort('average')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Avg
                    <SortIcon field="average" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {sortedAggregates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No EIPs found with prioritization data
                  </td>
                </tr>
              ) : (
                sortedAggregates.map((agg) => (
                  <TableRow
                    key={agg.eipId}
                    agg={agg}
                    elClients={elClients}
                    clClients={clClients}
                    isExpanded={expandedEip === agg.eipId}
                    onToggle={() => setExpandedEip(expandedEip === agg.eipId ? null : agg.eipId)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Score Legend</h3>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className={`px-2 py-1 rounded ${getScoreColor(5)}`}>5 = Strong Support</span>
            <span className={`px-2 py-1 rounded ${getScoreColor(4)}`}>4 = Support</span>
            <span className={`px-2 py-1 rounded ${getScoreColor(3)}`}>3 = Neutral</span>
            <span className={`px-2 py-1 rounded ${getScoreColor(2)}`}>2 = Low Priority</span>
            <span className={`px-2 py-1 rounded ${getScoreColor(1)}`}>1 = Oppose</span>
            <span className={`px-2 py-1 rounded ${getScoreColor(null, true)}`}>? = Uncertain</span>
            <span className={`px-2 py-1 rounded ${getScoreColor(null, false)}`}>- = Not Mentioned</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>
            Stances parsed from client team blog posts and public statements.
            Data may not reflect current positions.
          </p>
        </div>
      </div>
    </div>
  );
};

interface TableRowProps {
  agg: EipAggregateStance;
  elClients: string[];
  clClients: string[];
  isExpanded: boolean;
  onToggle: () => void;
}

const TableRow: React.FC<TableRowProps> = ({ agg, elClients, clClients, isExpanded, onToggle }) => {
  const eip = eipsData.find((e) => e.id === agg.eipId);
  const shortStage = agg.inclusionStage.replace(' for Inclusion', '');

  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <a
              href={eip ? getSpecificationUrl(eip) : `https://eips.ethereum.org/EIPS/eip-${agg.eipId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
            >
              {eip ? getProposalPrefix(eip) : 'EIP'}-{agg.eipId}
            </a>
            {agg.layer && (
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                agg.layer === 'EL'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
              }`}>
                {agg.layer}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <Link
            to={`/eips/${agg.eipId}`}
            className="text-sm text-slate-900 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400 line-clamp-1"
          >
            {agg.eipTitle}
          </Link>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block px-2 py-0.5 text-xs rounded ${getInclusionStageColor(agg.inclusionStage as InclusionStage)}`}>
            {shortStage}
          </span>
        </td>
        <td className="px-4 py-3">
          <ClientStanceBadges stances={agg.stances} clients={elClients} />
        </td>
        <td className="px-4 py-3">
          <ClientStanceBadges stances={agg.stances} clients={clClients} />
        </td>
        <td className="px-4 py-3 text-right">
          {agg.averageScore !== null ? (
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${getScoreColor(Math.round(agg.averageScore))}`}>
              {agg.averageScore.toFixed(1)}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <button
            onClick={onToggle}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </td>
      </tr>
      {/* Expanded Details Row */}
      {isExpanded && (
        <tr className="bg-slate-50 dark:bg-slate-800/50">
          <td colSpan={7} className="px-4 py-4">
            <ClientStancesGrid stances={agg.stances} elClients={elClients} clClients={clClients} />
          </td>
        </tr>
      )}
    </>
  );
};

interface ClientStanceBadgesProps {
  stances: ClientStance[];
  clients: string[];
}

const ClientStanceBadges: React.FC<ClientStanceBadgesProps> = ({ stances, clients }) => {
  return (
    <div className="flex justify-center gap-1">
      {clients.map((client) => {
        const stance = stances.find((s) => s.clientName === client);
        const hasStance = !!stance;
        const score = stance?.normalizedScore ?? null;

        return (
          <div
            key={client}
            className={`w-6 h-6 flex items-center justify-center text-[10px] font-medium rounded ${getScoreColor(score, hasStance)}`}
            title={stance ? `${client}: ${getRatingLabel(stance.ratingSystem, stance.rawRating)}` : `${client}: Not mentioned`}
          >
            {getClientInitials(client)}
          </div>
        );
      })}
    </div>
  );
};

interface ClientStancesGridProps {
  stances: ClientStance[];
  elClients: string[];
  clClients: string[];
}

const ClientStancesGrid: React.FC<ClientStancesGridProps> = ({ stances, elClients, clClients }) => {
  const renderClientRow = (client: string) => {
    const stance = stances.find((s) => s.clientName === client);

    return (
      <div key={client} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
        <span className="text-sm text-slate-700 dark:text-slate-300">{client}</span>
        <div className="flex items-center gap-2">
          {stance ? (
            <>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${getScoreColor(stance.normalizedScore)}`}>
                {getRatingLabel(stance.ratingSystem, stance.rawRating)}
              </span>
              {stance.comment && (
                <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={stance.comment}>
                  {stance.comment}
                </span>
              )}
              <a
                href={stance.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic">No stance</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          Execution Layer Clients
        </h4>
        <div>{elClients.map(renderClientRow)}</div>
      </div>
      <div>
        <h4 className="text-xs font-medium text-teal-600 dark:text-teal-400 mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
          Consensus Layer Clients
        </h4>
        <div>{clClients.map(renderClientRow)}</div>
      </div>
    </div>
  );
};

export default PrioritizationPage;
