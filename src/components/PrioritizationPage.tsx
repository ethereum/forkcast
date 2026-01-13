import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { networkUpgrades } from '../data/upgrades';
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

type FilterLayer = 'all' | 'EL' | 'CL';
type FilterStance = 'all' | 'support' | 'mixed' | 'oppose' | 'none';

const PrioritizationPage: React.FC = () => {
  const [selectedFork, setSelectedFork] = useState('glamsterdam');
  const [sortField, setSortField] = useState<SortField>('average');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterLayer, setFilterLayer] = useState<FilterLayer>('all');
  const [filterStance, setFilterStance] = useState<FilterStance>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [hideExcluded, setHideExcluded] = useState(true);
  const [expandedEip, setExpandedEip] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { aggregates, lastUpdated } = usePrioritizationData(selectedFork);

  useMetaTags({
    title: 'Client Prioritization - Forkcast',
    description: 'Aggregate view of Ethereum client team stances on CFI EIPs for network upgrades.',
    url: 'https://forkcast.org/priority',
  });

  // Get available forks
  const availableForks = useMemo(() => {
    return networkUpgrades.filter(
      (u) => !u.disabled && ['Upcoming', 'Planning', 'Research'].includes(u.status)
    );
  }, []);

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
          <Link
            to="/"
            className="text-2xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight inline-block mb-4"
          >
            Forkcast
          </Link>
          <div className="flex items-center justify-between gap-4 mb-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Client Prioritization
            </h1>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Last updated: {lastUpdated}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aggregate client team stances on proposed EIPs. Scores normalized to 1-5 scale.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {/* Fork selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Fork:</span>
              <select
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

            {/* Filters dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded text-sm font-medium transition-colors ${
                  activeFilterCount > 0
                    ? 'bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300'
                    : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
                } hover:bg-slate-100 dark:hover:bg-slate-600`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-purple-600 text-white rounded-full">
                    {activeFilterCount}
                  </span>
                )}
                <svg className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Filter dropdown panel */}
              {showFilters && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 p-4 space-y-4">
                  {/* Layer filter */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Layer</label>
                    <select
                      value={filterLayer}
                      onChange={(e) => setFilterLayer(e.target.value as FilterLayer)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All layers</option>
                      <option value="EL">Execution Layer only</option>
                      <option value="CL">Consensus Layer only</option>
                    </select>
                  </div>

                  {/* Client filter */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Client</label>
                    <select
                      value={filterClient}
                      onChange={(e) => setFilterClient(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All clients</option>
                      <optgroup label="Execution Layer">
                        {elClients.map((client) => (
                          <option key={client} value={client}>{client}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Consensus Layer">
                        {clClients.map((client) => (
                          <option key={client} value={client}>{client}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Stance filter */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Stance</label>
                    <select
                      value={filterStance}
                      onChange={(e) => setFilterStance(e.target.value as FilterStance)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All stances</option>
                      <option value="support">High support (avg ≥ 4)</option>
                      <option value="mixed">Contested</option>
                      <option value="oppose">More opposition</option>
                      <option value="none">No stances yet</option>
                    </select>
                  </div>

                  {/* Clear filters */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="w-full px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>

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
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
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
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    EL Clients
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
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
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
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
        <h4 className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Execution Layer Clients
        </h4>
        <div>{elClients.map(renderClientRow)}</div>
      </div>
      <div>
        <h4 className="text-xs font-medium text-sky-600 dark:text-sky-400 mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          Consensus Layer Clients
        </h4>
        <div>{clClients.map(renderClientRow)}</div>
      </div>
    </div>
  );
};

export default PrioritizationPage;
