import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { eipsData } from '../data/eips';
import { useComplexityData, getComplexityForEip } from '../hooks/useComplexityData';
import { usePrioritizationData } from '../hooks/usePrioritizationData';
import { getComplexityTierColor, getComplexityTierEmoji } from '../utils/complexity';
import { getScoreColor } from '../utils/prioritization';
import { getInclusionStage, getLaymanTitle, getProposalPrefix } from '../utils';
import { getInclusionStageColor } from '../utils/colors';
import { InclusionStage } from '../types';
import { useMetaTags } from '../hooks/useMetaTags';
import ThemeToggle from './ui/ThemeToggle';
import { EipComplexity } from '../types/complexity';
import { EipAggregateStance } from '../types/prioritization';
import devnetData from '../data/devnets/glamsterdam.json';

type SortField = 'eip' | 'complexity' | 'support' | 'stage' | 'devnets' | 'weighted';
type SortDirection = 'asc' | 'desc';

const MAX_STANCES = 11; // 5 EL + 6 CL clients

/**
 * Calculate confidence factor based on how many teams have weighed in
 */
function calculateConfidence(stanceCount: number): number {
  return 0.5 + 0.5 * (stanceCount / MAX_STANCES);
}

/**
 * Calculate complexity discount factor
 */
function calculateComplexityDiscount(complexityScore: number | null): number {
  return complexityScore !== null
    ? 1 / (1 + complexityScore / 20)
    : 0.67;
}

/**
 * Calculate effort-weighted consensus score
 * Combines: average support × confidence factor × complexity discount
 */
function calculateWeightedScore(
  avgSupport: number | null | undefined,
  stanceCount: number,
  complexityScore: number | null
): number | null {
  if (avgSupport === null || avgSupport === undefined) return null;

  const confidenceFactor = calculateConfidence(stanceCount);
  const complexityDiscount = calculateComplexityDiscount(complexityScore);

  return avgSupport * confidenceFactor * complexityDiscount;
}

/**
 * Generate tooltip text explaining the weighted score calculation
 */
function getWeightedScoreTooltip(
  avgSupport: number | null | undefined,
  stanceCount: number,
  complexityScore: number | null,
  weightedScore: number | null
): string {
  if (avgSupport === null || avgSupport === undefined || weightedScore === null) {
    return 'No support data available';
  }

  const confidence = calculateConfidence(stanceCount);
  const discount = calculateComplexityDiscount(complexityScore);

  const parts = [
    `${avgSupport.toFixed(1)} support`,
    `× ${confidence.toFixed(2)} confidence (${stanceCount}/${MAX_STANCES} teams)`,
    `× ${discount.toFixed(2)} testing complexity ${complexityScore !== null ? `(score: ${complexityScore})` : '(no data)'}`,
    `= ${weightedScore.toFixed(2)}`
  ];

  return parts.join('\n');
}

interface DevnetInfo {
  id: string;
  type: string;
  headliner: string;
  version: number;
}

interface CombinedEipData {
  eipId: number;
  title: string;
  stage: string;
  complexity: EipComplexity | null;
  priority: EipAggregateStance | null;
  layer: 'EL' | 'CL' | null;
  devnets: DevnetInfo[];
  weightedScore: number | null;
}

// Build a map of EIP ID to devnets it appears in
function buildDevnetMap(): Map<number, DevnetInfo[]> {
  const map = new Map<number, DevnetInfo[]>();

  for (const devnet of devnetData.devnets) {
    for (const eipId of devnet.eips) {
      const existing = map.get(eipId) || [];
      existing.push({
        id: devnet.id,
        type: devnet.type,
        headliner: devnet.headliner,
        version: devnet.version,
      });
      map.set(eipId, existing);
    }
  }

  return map;
}

const devnetMap = buildDevnetMap();

// Get short display for devnet (e.g., "BAL-2" for bal-devnet-2)
function getDevnetShortName(devnet: DevnetInfo): string {
  return `${devnet.headliner}-${devnet.version}`;
}

// Get color for devnet type
function getDevnetColor(headliner: string): string {
  switch (headliner.toUpperCase()) {
    case 'BAL':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
    case 'EPBS':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
    case 'GLAMSTERDAM':
      return 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }
}

const DevnetPrioritizationPage: React.FC = () => {
  const [sortField, setSortField] = useState<SortField>('weighted');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [hideExcluded, setHideExcluded] = useState(true);
  const [devnetFilter, setDevnetFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [layerFilter, setLayerFilter] = useState<'all' | 'EL' | 'CL'>('all');
  const [showScoringInfo, setShowScoringInfo] = useState(false);

  const { complexityMap, loading: complexityLoading, refetch } = useComplexityData();
  const { aggregates: priorityAggregates } = usePrioritizationData('glamsterdam');

  useMetaTags({
    title: 'Devnet Prioritization - Forkcast',
    description: 'Track devnet inclusion status, test complexity, and client support for EIPs in upcoming network upgrades.',
    url: 'https://forkcast.org/devnets',
  });

  // Get unique devnet options for filter
  const devnetOptions = useMemo(() => {
    const options = new Set<string>();
    for (const devnet of devnetData.devnets) {
      options.add(devnet.id);
    }
    return Array.from(options).sort();
  }, []);

  // Stage options in priority order
  const stageOptions = [
    'Included',
    'Scheduled for Inclusion',
    'Considered for Inclusion',
    'Proposed for Inclusion',
    'Declined for Inclusion',
    'Withdrawn',
  ];

  // Get all Glamsterdam EIPs and combine data
  const combinedData = useMemo(() => {
    const glamsterdamEips = eipsData.filter((eip) =>
      eip.forkRelationships.some(
        (rel) => rel.forkName.toLowerCase() === 'glamsterdam'
      )
    );

    return glamsterdamEips.map((eip): CombinedEipData => {
      const complexity = getComplexityForEip(complexityMap, eip.id);
      const priority = priorityAggregates.find((p) => p.eipId === eip.id) || null;
      const stage = getInclusionStage(eip, 'glamsterdam');
      const devnets = devnetMap.get(eip.id) || [];

      // Get layer from fork relationship
      const forkRel = eip.forkRelationships.find(
        (rel) => rel.forkName.toLowerCase() === 'glamsterdam'
      );
      const layer = forkRel?.layer as 'EL' | 'CL' | null;

      // Calculate weighted score
      const weightedScore = calculateWeightedScore(
        priority?.averageScore,
        priority?.stanceCount || 0,
        complexity?.totalScore ?? null
      );

      return {
        eipId: eip.id,
        title: getLaymanTitle(eip),
        stage,
        complexity,
        priority,
        layer,
        devnets,
        weightedScore,
      };
    });
  }, [complexityMap, priorityAggregates]);

  // Apply filtering
  const filteredData = useMemo(() => {
    let result = combinedData;

    // Filter out declined/withdrawn/unknown if hideExcluded is true
    if (hideExcluded) {
      result = result.filter((e) => {
        return e.stage !== 'Declined for Inclusion' && e.stage !== 'Withdrawn' && e.stage !== 'Unknown';
      });
    }

    // Apply devnet filter
    if (devnetFilter !== 'all') {
      result = result.filter((e) => e.devnets.some((d) => d.id === devnetFilter));
    }

    // Apply stage filter
    if (stageFilter !== 'all') {
      result = result.filter((e) => e.stage === stageFilter);
    }

    // Apply layer filter
    if (layerFilter !== 'all') {
      result = result.filter((e) => e.layer === layerFilter);
    }

    return result;
  }, [combinedData, hideExcluded, devnetFilter, stageFilter, layerFilter]);

  // Apply sorting
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'eip':
          comparison = a.eipId - b.eipId;
          break;
        case 'complexity':
          if (!a.complexity && !b.complexity) return 0;
          if (!a.complexity) return 1;
          if (!b.complexity) return -1;
          comparison = a.complexity.totalScore - b.complexity.totalScore;
          break;
        case 'support': {
          const aScore = a.priority?.averageScore ?? -1;
          const bScore = b.priority?.averageScore ?? -1;
          if (aScore === -1 && bScore === -1) return 0;
          if (aScore === -1) return 1;
          if (bScore === -1) return -1;
          comparison = aScore - bScore;
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
          comparison = (stageOrder[a.stage] || 99) - (stageOrder[b.stage] || 99);
          break;
        }
        case 'devnets': {
          // Sort by latest devnet version, then by number of devnets
          const aMax = a.devnets.length > 0 ? Math.max(...a.devnets.map((d) => d.version)) : -1;
          const bMax = b.devnets.length > 0 ? Math.max(...b.devnets.map((d) => d.version)) : -1;
          comparison = aMax - bMax;
          if (comparison === 0) {
            comparison = a.devnets.length - b.devnets.length;
          }
          break;
        }
        case 'weighted': {
          const aWeighted = a.weightedScore ?? -1;
          const bWeighted = b.weightedScore ?? -1;
          if (aWeighted === -1 && bWeighted === -1) return 0;
          if (aWeighted === -1) return 1;
          if (bWeighted === -1) return -1;
          comparison = aWeighted - bWeighted;
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortDirection]);

  // Calculate stats
  const stats = useMemo(() => {
    const inDevnet = filteredData.filter((e) => e.devnets.length > 0);
    const withComplexity = filteredData.filter((e) => e.complexity);
    const withPriority = filteredData.filter((e) => e.priority?.stanceCount && e.priority.stanceCount > 0);

    return {
      total: filteredData.length,
      inDevnet: inDevnet.length,
      withComplexity: withComplexity.length,
      withPriority: withPriority.length,
    };
  }, [filteredData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'eip' ? 'asc' : 'desc');
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
          <Link
            to="/"
            className="text-2xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight inline-block mb-4"
          >
            Forkcast
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Devnet Prioritization
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
              Glamsterdam
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track devnet inclusion, test complexity, and client support to help prioritize EIPs for upcoming devnets.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* Stage filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Stage:</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All</option>
                {stageOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt.replace(' for Inclusion', '')}</option>
                ))}
              </select>
            </div>

            {/* Layer filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Layer:</span>
              <select
                value={layerFilter}
                onChange={(e) => setLayerFilter(e.target.value as 'all' | 'EL' | 'CL')}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All</option>
                <option value="EL">EL</option>
                <option value="CL">CL</option>
              </select>
            </div>

            {/* Devnet filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Devnet:</span>
              <select
                value={devnetFilter}
                onChange={(e) => setDevnetFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All</option>
                {devnetOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
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

            {/* Stats */}
            <div className="flex items-center gap-4 ml-auto text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {stats.total} EIPs
              </span>
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500">|</span>
              <span className="hidden sm:inline text-violet-600 dark:text-violet-400">
                {stats.inDevnet} in devnets
              </span>
              <button
                onClick={refetch}
                disabled={complexityLoading}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                title="Refresh complexity data"
              >
                <svg className={`w-4 h-4 ${complexityLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Scoring Explanation */}
        <div className="mb-4">
          <button
            onClick={() => setShowScoringInfo(!showScoringInfo)}
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showScoringInfo ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            How is the Weighted Score calculated?
          </button>

          {showScoringInfo && (
            <div className="mt-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                The <span className="font-medium text-purple-600 dark:text-purple-400">Weighted Score</span> helps identify EIPs that are well-supported, well-vetted, and relatively easy to implement. Higher scores suggest stronger candidates for prioritization.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-xs font-medium shrink-0">1</div>
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">Average Support</div>
                    <div className="text-slate-600 dark:text-slate-400">How much do client teams want this? (1-5 scale from prioritization data)</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-medium shrink-0">2</div>
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">Confidence Factor <span className="font-normal text-slate-500">(0.5 - 1.0)</span></div>
                    <div className="text-slate-600 dark:text-slate-400">How many teams have weighed in? More opinions = more confidence in the average. An EIP with 8/11 teams responding is more reliable than one with 2/11.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-300 text-xs font-medium shrink-0">3</div>
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">Testing Complexity Discount <span className="font-normal text-slate-500">(0.4 - 1.0)</span></div>
                    <div className="text-slate-600 dark:text-slate-400">How much testing effort is required? Based on <a href="https://github.com/ethsteel/pm" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline">STEEL</a> assessments of testing complexity (not implementation complexity). Lower scores get higher multipliers. An EIP with score 5 keeps ~80% of its value; one with score 30 keeps ~40%.</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Example:</span> An EIP with 4.0 support from 8 teams and testing complexity score 10:
                </div>
                <div className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                  4.0 × 0.86 (8/11 teams) × 0.67 (testing complexity 10) = <span className="text-purple-600 dark:text-purple-400 font-medium">2.31</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-2">
          {sortedData.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center text-slate-500 dark:text-slate-400">
              No EIPs found
            </div>
          ) : (
            sortedData.map((item) => {
              const eip = eipsData.find((e) => e.id === item.eipId);

              return (
                <div
                  key={item.eipId}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                >
                  {/* Header row: EIP number + Weighted score */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <Link
                        to={`/eips/${item.eipId}`}
                        className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        {eip ? getProposalPrefix(eip) : 'EIP'}-{item.eipId}
                      </Link>
                      {item.layer && (
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                          item.layer === 'EL'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                            : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300'
                        }`}>
                          {item.layer}
                        </span>
                      )}
                    </div>
                    {item.weightedScore !== null && (
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getScoreColor(Math.round(item.weightedScore))}`}
                        title={getWeightedScoreTooltip(
                          item.priority?.averageScore,
                          item.priority?.stanceCount || 0,
                          item.complexity?.totalScore ?? null,
                          item.weightedScore
                        )}
                      >
                        {item.weightedScore.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-sm text-slate-900 dark:text-slate-100 mb-3">
                    {item.title}
                  </p>

                  {/* Tags row: Stage + Devnets */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`inline-block px-2 py-0.5 text-[10px] rounded ${getInclusionStageColor(item.stage as InclusionStage)}`}>
                      {item.stage.replace(' for Inclusion', '')}
                    </span>
                    {item.devnets.map((devnet) => (
                      <span
                        key={devnet.id}
                        className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${getDevnetColor(devnet.headliner)}`}
                      >
                        {getDevnetShortName(devnet)}
                      </span>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {item.complexity && (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 dark:text-slate-500">Test:</span>
                        <span className={`px-1.5 py-0.5 rounded ${getComplexityTierColor(item.complexity.tier)}`}>
                          {getComplexityTierEmoji(item.complexity.tier)} {item.complexity.totalScore}
                        </span>
                      </div>
                    )}
                    {item.priority?.averageScore !== null && item.priority?.averageScore !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 dark:text-slate-500">Support:</span>
                        <span className={`px-1.5 py-0.5 rounded ${getScoreColor(Math.round(item.priority.averageScore))}`}>
                          {item.priority.averageScore.toFixed(1)}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">
                          ({item.priority.stanceCount})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
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
                    onClick={() => handleSort('devnets')}
                  >
                    <div className="flex items-center gap-2">
                      Devnets
                      <SortIcon field="devnets" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                    onClick={() => handleSort('complexity')}
                    title="Testing complexity score from STEEL"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Test Complexity
                      <SortIcon field="complexity" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                    onClick={() => handleSort('support')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Avg Support
                      <SortIcon field="support" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                    Stances
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                    onClick={() => handleSort('weighted')}
                    title="Support × Confidence × Testing Complexity Discount"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Weighted
                      <SortIcon field="weighted" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No EIPs found
                    </td>
                  </tr>
                ) : (
                  sortedData.map((item) => {
                    const eip = eipsData.find((e) => e.id === item.eipId);

                    return (
                      <tr
                        key={item.eipId}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/eips/${item.eipId}`}
                            className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            {eip ? getProposalPrefix(eip) : 'EIP'}-{item.eipId}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-900 dark:text-slate-100">
                            {item.title}
                          </span>
                          {item.layer && (
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                              item.layer === 'EL'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300'
                            }`}>
                              {item.layer}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded ${getInclusionStageColor(item.stage as InclusionStage)}`}>
                            {item.stage.replace(' for Inclusion', '')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.devnets.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.devnets
                                .sort((a, b) => a.version - b.version)
                                .map((devnet) => (
                                  <span
                                    key={devnet.id}
                                    className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${getDevnetColor(devnet.headliner)}`}
                                    title={devnet.id}
                                  >
                                    {getDevnetShortName(devnet)}
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.complexity ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${getComplexityTierColor(item.complexity.tier)}`}>
                              {getComplexityTierEmoji(item.complexity.tier)} {item.complexity.totalScore}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.priority?.averageScore !== null && item.priority?.averageScore !== undefined ? (
                            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getScoreColor(Math.round(item.priority.averageScore))}`}>
                              {item.priority.averageScore.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.priority?.stanceCount ? (
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {item.priority.stanceCount}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.weightedScore !== null ? (
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-medium rounded cursor-help ${getScoreColor(Math.round(item.weightedScore))}`}
                              title={getWeightedScoreTooltip(
                                item.priority?.averageScore,
                                item.priority?.stanceCount || 0,
                                item.complexity?.totalScore ?? null,
                                item.weightedScore
                              )}
                            >
                              {item.weightedScore.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>
            Complexity data from{' '}
            <a href="https://github.com/ethsteel/pm" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600 dark:hover:text-slate-300">
              STEEL
            </a>
            {' • '}
            Prioritization data from client team publications
            {' • '}
            <Link to="/complexity" className="underline hover:text-slate-600 dark:hover:text-slate-300">
              Full complexity view
            </Link>
            {' • '}
            <Link to="/priority" className="underline hover:text-slate-600 dark:hover:text-slate-300">
              Full priority view
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DevnetPrioritizationPage;
