import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './ui/Logo';
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
import AnalysisNav from './ui/AnalysisNav';
import { EipComplexity } from '../types/complexity';
import { EipAggregateStance } from '../types/prioritization';
import devnetDataRaw from '../data/devnets/glamsterdam.json';

const devnetData = devnetDataRaw as {
  upgrade: string;
  lastUpdated: string;
  devnets: Array<{
    id: string;
    type: string;
    headliner: string;
    version: number;
    launchDate: string;
    eips: number[];
    optionalEips?: number[];
    isTarget?: boolean;
  }>;
};

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
  launchDate?: string;
  isTarget?: boolean;
  optional?: boolean;
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
        launchDate: devnet.launchDate,
        isTarget: devnet.isTarget,
      });
      map.set(eipId, existing);
    }
    for (const eipId of devnet.optionalEips || []) {
      const existing = map.get(eipId) || [];
      existing.push({
        id: devnet.id,
        type: devnet.type,
        headliner: devnet.headliner,
        version: devnet.version,
        launchDate: devnet.launchDate,
        isTarget: devnet.isTarget,
        optional: true,
      });
      map.set(eipId, existing);
    }
  }

  return map;
}

// Format date for display (e.g., "Oct 28, 2025")
function formatLaunchDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const devnetMap = buildDevnetMap();

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
  const [hideInDevnet, setHideInDevnet] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [layerFilter, setLayerFilter] = useState<'all' | 'EL' | 'CL'>('all');
  const [showScoringInfo, setShowScoringInfo] = useState(false);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [expandedDevnets, setExpandedDevnets] = useState<Set<string>>(new Set());

  const { complexityMap, loading: complexityLoading, refetch } = useComplexityData();

  // Toggle a single devnet's expanded state
  const toggleDevnet = (devnetId: string) => {
    setExpandedDevnets((prev) => {
      const next = new Set(prev);
      if (next.has(devnetId)) {
        next.delete(devnetId);
      } else {
        next.add(devnetId);
      }
      return next;
    });
  };

  // Toggle all devnets expanded/collapsed
  const toggleAllDevnets = () => {
    const allDevnetIds = devnetData.devnets.map((d) => d.id);
    const allExpanded = allDevnetIds.every((id) => expandedDevnets.has(id));
    if (allExpanded) {
      setExpandedDevnets(new Set());
    } else {
      setExpandedDevnets(new Set(allDevnetIds));
    }
  };

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
  const activeFilterCount = [
    stageFilter !== 'all',
    layerFilter !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStageFilter('all');
    setLayerFilter('all');
  };
  const { aggregates: priorityAggregates } = usePrioritizationData('glamsterdam');

  useMetaTags({
    title: 'Devnet Prioritization - Forkcast',
    description: 'Track devnet inclusion status, test complexity, and client support for EIPs in upcoming network upgrades.',
    url: 'https://forkcast.org/devnets',
  });

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

      const layer = eip.layer || null;

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
    if (hideInDevnet) {
      result = result.filter((e) => e.devnets.length === 0);
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
  }, [combinedData, hideExcluded, hideInDevnet, stageFilter, layerFilter]);

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

  // Calculate devnet progression data - which EIPs are new in each devnet
  const devnetProgression = useMemo(() => {
    // Sort devnets by version (ascending) to compare progression
    const sortedDevnets = [...devnetData.devnets].sort((a, b) => a.version - b.version);

    const progression: Array<{
      devnet: typeof devnetData.devnets[0];
      eips: number[];
      optionalEips: number[];
      newEips: Set<number>;
      previousEips: Set<number>;
    }> = [];

    let previousEipSet = new Set<number>();

    for (const devnet of sortedDevnets) {
      const allEips = [...devnet.eips, ...(devnet.optionalEips || [])];
      const currentEipSet = new Set(allEips);
      const newEips = new Set<number>();

      // Find EIPs that are in current but not in previous
      for (const eipId of currentEipSet) {
        if (!previousEipSet.has(eipId)) {
          newEips.add(eipId);
        }
      }

      progression.push({
        devnet,
        eips: allEips,
        optionalEips: devnet.optionalEips || [],
        newEips,
        previousEips: previousEipSet,
      });

      previousEipSet = currentEipSet;
    }

    // Return in reverse order (most recent first)
    return progression.reverse();
  }, []);

  // Get EIP data for a devnet section
  const getDevnetEipData = (eipIds: number[]) => {
    return eipIds.map((eipId) => {
      const eip = eipsData.find((e) => e.id === eipId);
      const combined = combinedData.find((c) => c.eipId === eipId);
      return { eipId, eip, combined };
    }).sort((a, b) => a.eipId - b.eipId);
  };

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
          <Logo size="md" className="mb-4" />
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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            This page is not prescriptive. It aggregates data points as a decision-making aid, not a recommendation.
          </p>
          <div className="mt-4">
            <AnalysisNav />
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
                    {/* Stage Filter */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Inclusion Stage</h3>
                      <div className="flex flex-wrap gap-2">
                        {[{ value: 'all', label: 'All Stages' }, ...stageOptions.map(s => ({ value: s, label: s.replace(' for Inclusion', '') }))].map(({ value, label }) => {
                          const isSelected = stageFilter === value;
                          return (
                            <button
                              key={value}
                              onClick={() => setStageFilter(value)}
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

                    {/* Layer Filter */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Layer</h3>
                      <div className="flex flex-wrap gap-2">
                        {(['all', 'EL', 'CL'] as const).map((layer) => {
                          const isSelected = layerFilter === layer;
                          const label = layer === 'all' ? 'All Layers' : layer === 'EL' ? 'Execution Layer' : 'Consensus Layer';
                          return (
                            <button
                              key={layer}
                              onClick={() => setLayerFilter(layer)}
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

                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <button
                    onClick={() => setFiltersModalOpen(false)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Show {sortedData.length} {sortedData.length === 1 ? 'result' : 'results'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Devnets Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Active Devnets
            </h2>
            <button
              onClick={toggleAllDevnets}
              className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
            >
              {devnetData.devnets.every((d) => expandedDevnets.has(d.id)) ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            EIPs currently being tested in devnets. Expand each to see implementation details.
          </p>

          <div className="space-y-3">
            {devnetProgression.map(({ devnet, eips, optionalEips, newEips }) => {
              const optionalEipSet = new Set(optionalEips);
              const isExpanded = expandedDevnets.has(devnet.id);
              const devnetEipData = getDevnetEipData(eips);
              const newCount = newEips.size;
              const notesUrl = `https://notes.ethereum.org/@ethpandaops/${devnet.headliner.toLowerCase()}-devnet-${devnet.version}`;

              return (
                <div
                  key={devnet.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                >
                  {/* Devnet Header */}
                  <button
                    onClick={() => toggleDevnet(devnet.id)}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                  >
                    {/* Left: Badge */}
                    <span className={`px-2.5 py-1 text-sm font-semibold rounded shrink-0 ${getDevnetColor(devnet.headliner)}`}>
                      {devnet.id}
                    </span>

                    {/* Center: Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Date with icon */}
                        {devnet.launchDate && (
                          <span className={`inline-flex items-center gap-1.5 text-xs ${devnet.isTarget ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {devnet.isTarget && <span className="font-medium">Target:</span>}
                            {formatLaunchDate(devnet.launchDate)}
                          </span>
                        )}

                        <span className="text-slate-300 dark:text-slate-600">•</span>

                        {/* EIP count */}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {eips.length} {eips.length === 1 ? 'EIP' : 'EIPs'}
                        </span>

                        {/* New badge */}
                        {newCount > 0 && devnet.version > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full uppercase tracking-wide">
                            +{newCount} new
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <a
                        href={notesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hidden sm:inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                      >
                        <span className="underline decoration-1 underline-offset-2">ethPandaOps notes</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="border-t border-slate-200 dark:border-slate-700">
                      {/* Desktop Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">EIP</th>
                              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Title</th>
                              <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400">Avg Support</th>
                              <th className="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400">Test Complexity</th>
                              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Stage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {devnetEipData.map(({ eipId, eip, combined }) => (
                              <tr key={eipId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <Link
                                      to={`/eips/${eipId}`}
                                      className="font-mono text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                                    >
                                      {eip ? getProposalPrefix(eip) : 'EIP'}-{eipId}
                                    </Link>
                                    {combined?.layer && (
                                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                                        combined.layer === 'EL'
                                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                          : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                                      }`}>
                                        {combined.layer}
                                      </span>
                                    )}
                                    {newEips.has(eipId) && devnet.version > 0 && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded uppercase">
                                        New
                                      </span>
                                    )}
                                    {optionalEipSet.has(eipId) && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 rounded uppercase">
                                        Optional
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">
                                  {combined?.title || eip?.title || `EIP-${eipId}`}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {combined?.priority?.averageScore != null ? (
                                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getScoreColor(Math.round(combined.priority.averageScore))}`}>
                                      {combined.priority.averageScore.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {combined?.complexity ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${getComplexityTierColor(combined.complexity.tier)}`}>
                                      {getComplexityTierEmoji(combined.complexity.tier)} {combined.complexity.totalScore}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5">
                                  {combined?.stage ? (
                                    <span className={`inline-block px-2 py-0.5 text-xs rounded ${getInclusionStageColor(combined.stage as InclusionStage)}`}>
                                      {combined.stage.replace(' for Inclusion', '')}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card Layout */}
                      <div className="md:hidden p-3 space-y-2">
                        {devnetEipData.map(({ eipId, eip, combined }) => (
                          <div
                            key={eipId}
                            className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/eips/${eipId}`}
                                  className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                                >
                                  {eip ? getProposalPrefix(eip) : 'EIP'}-{eipId}
                                </Link>
                                {combined?.layer && (
                                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                                    combined.layer === 'EL'
                                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                      : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                                  }`}>
                                    {combined.layer}
                                  </span>
                                )}
                                {newEips.has(eipId) && devnet.version > 0 && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded uppercase">
                                    New
                                  </span>
                                )}
                                {optionalEipSet.has(eipId) && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 rounded uppercase">
                                    Optional
                                  </span>
                                )}
                              </div>
                              {combined?.stage && (
                                <span className={`px-2 py-0.5 text-[10px] rounded ${getInclusionStageColor(combined.stage as InclusionStage)}`}>
                                  {combined.stage.replace(' for Inclusion', '')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-900 dark:text-slate-100 mb-2">
                              {combined?.title || eip?.title || `EIP-${eipId}`}
                            </p>
                            <div className="flex items-center gap-3 text-xs">
                              {combined?.priority?.averageScore != null && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-500 dark:text-slate-400">Support:</span>
                                  <span className={`px-1.5 py-0.5 rounded ${getScoreColor(Math.round(combined.priority.averageScore))}`}>
                                    {combined.priority.averageScore.toFixed(1)}
                                  </span>
                                </div>
                              )}
                              {combined?.complexity && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-500 dark:text-slate-400">Test:</span>
                                  <span className={`px-1.5 py-0.5 rounded ${getComplexityTierColor(combined.complexity.tier)}`}>
                                    {getComplexityTierEmoji(combined.complexity.tier)} {combined.complexity.totalScore}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* EIP Candidates Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              EIP Candidates
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {sortedData.length} {sortedData.length === 1 ? 'EIP' : 'EIPs'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Aggregated data points as a decision-making aid, not a recommendation.
          </p>

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
                  The <span className="font-medium text-purple-600 dark:text-purple-400">Weighted Score</span> combines support, confidence, and testing complexity into a single metric. Higher scores indicate EIPs that are well-supported, well-vetted, and have lower testing overhead.
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

          {/* Toolbar */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
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

              {/* Hide excluded toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideExcluded}
                  onChange={(e) => setHideExcluded(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">Active only</span>
              </label>

              {/* Hide in devnet toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideInDevnet}
                  onChange={(e) => setHideInDevnet(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">Hide in devnet</span>
              </label>

              {/* Refresh button */}
              <button
                onClick={refetch}
                disabled={complexityLoading}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors disabled:opacity-50 ml-auto"
                title="Refresh complexity data"
              >
                <svg className={`w-4 h-4 ${complexityLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
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
                        {devnet.id}
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
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/eips/${item.eipId}`}
                              className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                            >
                              {eip ? getProposalPrefix(eip) : 'EIP'}-{item.eipId}
                            </Link>
                            {item.layer && (
                              <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                                item.layer === 'EL'
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                  : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                              }`}>
                                {item.layer}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-900 dark:text-slate-100">
                            {item.title}
                          </span>
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
                                    title={devnet.optional ? `${devnet.id} (optional)` : devnet.id}
                                  >
                                    {devnet.id}{devnet.optional ? '*' : ''}
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
