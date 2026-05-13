import type { EipComplexity } from '../complexity/types';
import type { EIP, ForkRelationship, InclusionStage, ProposalType } from '../../types/eip';
import type { ActiveDevnetSeries } from '../../types/devnet-networks';
import type { EipAggregateStance } from '../../types/prioritization';
import {
  getForkRelationship,
  getInclusionStage,
  getLaymanTitle,
  getProposalPrefix,
  getSpecificationUrl,
  isHeadliner,
  wasHeadlinerCandidate,
} from '../../utils/eip';

export type ExplorerLayerFilter = 'all' | 'EL' | 'CL';
export type ExplorerStageFilter = 'active' | 'all' | InclusionStage;
export type ExplorerSignalFilter =
  | 'all'
  | 'headliners'
  | 'active-devnet'
  | 'high-complexity'
  | 'unassessed'
  | 'contested';
export type ExplorerSortKey = 'stage' | 'eip' | 'complexity' | 'devnets' | 'client-priority';
export type ExplorerSortDirection = 'asc' | 'desc';
export type HeadlinerStatus = 'selected' | 'candidate' | 'none';
export type ClientPriorityTier = 'strong-support' | 'support' | 'split' | 'low-support' | 'no-signal';

export interface DevnetCatalogEntry {
  id: string;
  type: string;
  headliner?: string;
  version: number;
  launchDate?: string;
  eips: number[];
  optionalEips?: number[];
  isTarget?: boolean;
}

export interface ExplorerDevnetMembership {
  id: string;
  series: string;
  type: string;
  version: number;
  launchDate?: string;
  optional: boolean;
  isTarget: boolean;
}

export interface ExplorerStageEvent {
  status: ForkRelationship['statusHistory'][number]['status'];
  stage: InclusionStage;
  call: ForkRelationship['statusHistory'][number]['call'];
  date: string | null;
  timestamp?: number;
}

export interface ExplorerPresentationEvent {
  type: NonNullable<ForkRelationship['presentationHistory']>[number]['type'];
  call?: NonNullable<ForkRelationship['presentationHistory']>[number]['call'];
  link?: string;
  date: string;
  timestamp?: number;
}

export interface EipExplorerItem {
  eip: EIP;
  eipId: number;
  proposalType: ProposalType;
  title: string;
  stage: InclusionStage;
  layer: 'EL' | 'CL' | null;
  specificationUrl: string;
  discussionUrl?: string;
  headlinerStatus: HeadlinerStatus;
  activeDevnets: ExplorerDevnetMembership[];
  complexity: EipComplexity | null;
  priority: EipAggregateStance | null;
  clientPriority: ClientPrioritySignal;
  stageHistory: ExplorerStageEvent[];
  presentationHistory: ExplorerPresentationEvent[];
  searchText: string;
}

export interface ClientPrioritySignal {
  tier: ClientPriorityTier;
  label: string;
  score: number | null;
  stanceCount: number;
  supportCount: number;
  neutralCount: number;
  opposeCount: number;
}

export interface EipExplorerFilters {
  query: string;
  layer: ExplorerLayerFilter;
  signal: ExplorerSignalFilter;
  stage: ExplorerStageFilter;
}

export interface EipExplorerSort {
  key: ExplorerSortKey;
  direction: ExplorerSortDirection;
}

export interface EipExplorerSummary {
  total: number;
  active: number;
  denied: number;
  selectedHeadliners: number;
  headlinerCandidates: number;
  inActiveDevnet: number;
  highComplexity: number;
  unassessed: number;
  contested: number;
}

interface BuildEipExplorerItemsInput {
  eips: EIP[];
  forkName: string;
  devnets: DevnetCatalogEntry[];
  activeDevnetIds: Set<string>;
  complexityMap: Map<number, EipComplexity>;
  priorityAggregates: EipAggregateStance[];
}

export const EIP_EXPLORER_STAGE_ORDER: InclusionStage[] = [
  'Proposed for Inclusion',
  'Considered for Inclusion',
  'Scheduled for Inclusion',
  'Included',
  'Declined for Inclusion',
  'Withdrawn',
  'Unknown',
];

export const EIP_EXPLORER_DEFAULT_FILTERS: EipExplorerFilters = {
  query: '',
  layer: 'all',
  signal: 'all',
  stage: 'active',
};

export const EIP_EXPLORER_DEFAULT_SORT: EipExplorerSort = {
  key: 'stage',
  direction: 'asc',
};

export function buildActiveDevnetIdSet(activeSeries: ActiveDevnetSeries[]): Set<string> {
  return new Set(activeSeries.flatMap((series) => series.activeKeys));
}

export function buildEipExplorerItems({
  eips,
  forkName,
  devnets,
  activeDevnetIds,
  complexityMap,
  priorityAggregates,
}: BuildEipExplorerItemsInput): EipExplorerItem[] {
  const lowerForkName = forkName.toLowerCase();
  const priorityByEip = new Map(priorityAggregates.map((priority) => [priority.eipId, priority]));
  const activeDevnetsByEip = buildActiveDevnetMap(devnets, activeDevnetIds);

  return eips
    .filter((eip) =>
      eip.forkRelationships.some((relationship) => relationship.forkName.toLowerCase() === lowerForkName)
    )
    .map((eip) => {
      const relationship = getForkRelationship(eip, forkName);
      const stage = getInclusionStage(eip, forkName);
      const proposalType = getProposalPrefix(eip);
      const activeDevnets = activeDevnetsByEip.get(eip.id) ?? [];
      const complexity = complexityMap.get(eip.id) ?? null;
      const priority = priorityByEip.get(eip.id) ?? null;
      const clientPriority = deriveClientPrioritySignal(priority);
      const stageHistory = buildStageHistory(relationship);
      const presentationHistory = buildPresentationHistory(relationship);
      const headlinerStatus: HeadlinerStatus = isHeadliner(eip, forkName)
        ? 'selected'
        : wasHeadlinerCandidate(eip, forkName)
          ? 'candidate'
          : 'none';
      const title = getLaymanTitle(eip);

      return {
        eip,
        eipId: eip.id,
        proposalType,
        title,
        stage,
        layer: eip.layer ?? null,
        specificationUrl: getSpecificationUrl(eip),
        discussionUrl: eip.discussionLink,
        headlinerStatus,
        activeDevnets,
        complexity,
        priority,
        clientPriority,
        stageHistory,
        presentationHistory,
        searchText: buildSearchText({
          eip,
          proposalType,
          title,
          stage,
          activeDevnets,
          complexity,
          priority,
          clientPriority,
          headlinerStatus,
          presentationHistory,
        }),
      };
    });
}

export function filterEipExplorerItems(items: EipExplorerItem[], filters: EipExplorerFilters): EipExplorerItem[] {
  const query = filters.query.trim().toLowerCase();

  return items.filter((item) => {
    if (query && !item.searchText.includes(query)) return false;
    if (filters.layer !== 'all' && item.layer !== filters.layer) return false;
    if (filters.stage === 'active' && !isActiveExplorerStage(item.stage)) return false;
    if (filters.stage !== 'active' && filters.stage !== 'all' && item.stage !== filters.stage) return false;

    switch (filters.signal) {
      case 'all':
        return true;
      case 'headliners':
        return item.headlinerStatus !== 'none';
      case 'active-devnet':
        return item.activeDevnets.length > 0;
      case 'high-complexity':
        return item.complexity?.tier === 'High';
      case 'unassessed':
        return item.complexity === null;
      case 'contested':
        return item.clientPriority.tier === 'split';
    }
  });
}

export function sortEipExplorerItems(items: EipExplorerItem[], sort: EipExplorerSort): EipExplorerItem[] {
  return [...items].sort((a, b) => {
    let comparison = 0;

    switch (sort.key) {
      case 'eip':
        comparison = a.eipId - b.eipId;
        break;
      case 'stage':
        comparison = compareStages(a.stage, b.stage);
        if (comparison === 0) comparison = compareHeadlinerStatus(a.headlinerStatus, b.headlinerStatus);
        if (comparison === 0) comparison = b.activeDevnets.length - a.activeDevnets.length;
        if (comparison === 0) comparison = a.eipId - b.eipId;
        break;
      case 'complexity':
        comparison = compareNullableNumbers(a.complexity?.totalScore ?? null, b.complexity?.totalScore ?? null);
        if (comparison === 0) comparison = compareStages(a.stage, b.stage);
        if (comparison === 0) comparison = a.eipId - b.eipId;
        break;
      case 'devnets':
        comparison = a.activeDevnets.length - b.activeDevnets.length;
        if (comparison === 0) comparison = compareLatestDevnetVersion(a.activeDevnets, b.activeDevnets);
        if (comparison === 0) comparison = compareStages(a.stage, b.stage);
        if (comparison === 0) comparison = a.eipId - b.eipId;
        break;
      case 'client-priority':
        comparison = compareNullableNumbers(a.clientPriority.score, b.clientPriority.score);
        if (comparison === 0) comparison = a.clientPriority.stanceCount - b.clientPriority.stanceCount;
        if (comparison === 0) comparison = compareStages(a.stage, b.stage);
        if (comparison === 0) comparison = a.eipId - b.eipId;
        break;
    }

    return sort.direction === 'asc' ? comparison : -comparison;
  });
}

export function summarizeEipExplorerItems(items: EipExplorerItem[]): EipExplorerSummary {
  return {
    total: items.length,
    active: items.filter((item) => isActiveExplorerStage(item.stage)).length,
    denied: items.filter((item) => isDeniedExplorerStage(item.stage)).length,
    selectedHeadliners: items.filter((item) => item.headlinerStatus === 'selected').length,
    headlinerCandidates: items.filter((item) => item.headlinerStatus !== 'none').length,
    inActiveDevnet: items.filter((item) => item.activeDevnets.length > 0).length,
    highComplexity: items.filter((item) => item.complexity?.tier === 'High').length,
    unassessed: items.filter((item) => item.complexity === null).length,
    contested: items.filter((item) => item.clientPriority.tier === 'split').length,
  };
}

export function deriveClientPrioritySignal(priority: EipAggregateStance | null): ClientPrioritySignal {
  const score = priority?.averageScore ?? null;
  const stanceCount = priority?.stanceCount ?? 0;
  const supportCount = priority?.supportCount ?? 0;
  const neutralCount = priority?.neutralCount ?? 0;
  const opposeCount = priority?.opposeCount ?? 0;

  if (score === null || stanceCount === 0) {
    return {
      tier: 'no-signal',
      label: 'No signal',
      score: null,
      stanceCount,
      supportCount,
      neutralCount,
      opposeCount,
    };
  }

  if (supportCount > 0 && opposeCount > 0) {
    return {
      tier: 'split',
      label: 'Split',
      score,
      stanceCount,
      supportCount,
      neutralCount,
      opposeCount,
    };
  }

  if (score >= 4.25) {
    return {
      tier: 'strong-support',
      label: 'Strong support',
      score,
      stanceCount,
      supportCount,
      neutralCount,
      opposeCount,
    };
  }

  if (score >= 3.5) {
    return {
      tier: 'support',
      label: 'Support',
      score,
      stanceCount,
      supportCount,
      neutralCount,
      opposeCount,
    };
  }

  return {
    tier: 'low-support',
    label: 'Low support',
    score,
    stanceCount,
    supportCount,
    neutralCount,
    opposeCount,
  };
}

export function isActiveExplorerStage(stage: InclusionStage): boolean {
  return stage !== 'Declined for Inclusion' && stage !== 'Withdrawn' && stage !== 'Unknown';
}

export function isDeniedExplorerStage(stage: InclusionStage): boolean {
  return stage === 'Declined for Inclusion' || stage === 'Withdrawn';
}

export function shortStageLabel(stage: InclusionStage): string {
  return stage.replace(' for Inclusion', '');
}

function buildActiveDevnetMap(
  devnets: DevnetCatalogEntry[],
  activeDevnetIds: Set<string>,
): Map<number, ExplorerDevnetMembership[]> {
  const map = new Map<number, ExplorerDevnetMembership[]>();

  for (const devnet of devnets) {
    if (!activeDevnetIds.has(devnet.id)) continue;
    addDevnetMemberships(map, devnet, devnet.eips, false);
    addDevnetMemberships(map, devnet, devnet.optionalEips ?? [], true);
  }

  for (const memberships of map.values()) {
    memberships.sort((a, b) => {
      const seriesComparison = a.series.localeCompare(b.series);
      if (seriesComparison !== 0) return seriesComparison;
      return a.version - b.version;
    });
  }

  return map;
}

function addDevnetMemberships(
  map: Map<number, ExplorerDevnetMembership[]>,
  devnet: DevnetCatalogEntry,
  eipIds: number[],
  optional: boolean,
): void {
  for (const eipId of eipIds) {
    const existing = map.get(eipId) ?? [];
    existing.push({
      id: devnet.id,
      series: deriveDevnetSeries(devnet),
      type: devnet.type,
      version: devnet.version,
      launchDate: devnet.launchDate,
      optional,
      isTarget: devnet.isTarget ?? false,
    });
    map.set(eipId, existing);
  }
}

function deriveDevnetSeries(devnet: Pick<DevnetCatalogEntry, 'id' | 'headliner'>): string {
  if (devnet.headliner) return devnet.headliner;
  const match = devnet.id.match(/^(.+)-devnet-\d+$/);
  return match ? match[1].toUpperCase() : devnet.id.toUpperCase();
}

function buildStageHistory(relationship: ForkRelationship | undefined): ExplorerStageEvent[] {
  return relationship?.statusHistory.map((event) => ({
    status: event.status,
    stage: forkStatusToStage(event.status),
    call: event.call,
    date: event.date,
    timestamp: event.timestamp,
  })) ?? [];
}

function buildPresentationHistory(relationship: ForkRelationship | undefined): ExplorerPresentationEvent[] {
  return relationship?.presentationHistory?.map((event) => ({
    type: event.type,
    call: event.call,
    link: event.link,
    date: event.date,
    timestamp: event.timestamp,
  })) ?? [];
}

function forkStatusToStage(status: ForkRelationship['statusHistory'][number]['status']): InclusionStage {
  switch (status) {
    case 'Proposed':
      return 'Proposed for Inclusion';
    case 'Considered':
      return 'Considered for Inclusion';
    case 'Scheduled':
      return 'Scheduled for Inclusion';
    case 'Declined':
      return 'Declined for Inclusion';
    case 'Included':
      return 'Included';
    case 'Withdrawn':
      return 'Withdrawn';
  }
}

function buildSearchText({
  eip,
  proposalType,
  title,
  stage,
  activeDevnets,
  complexity,
  priority,
  clientPriority,
  headlinerStatus,
  presentationHistory,
}: {
  eip: EIP;
  proposalType: ProposalType;
  title: string;
  stage: InclusionStage;
  activeDevnets: ExplorerDevnetMembership[];
  complexity: EipComplexity | null;
  priority: EipAggregateStance | null;
  clientPriority: ClientPrioritySignal;
  headlinerStatus: HeadlinerStatus;
  presentationHistory: ExplorerPresentationEvent[];
}): string {
  return [
    `${proposalType}-${eip.id}`,
    eip.title,
    title,
    stage,
    eip.layer ?? '',
    headlinerStatus === 'selected' ? 'selected headliner' : '',
    headlinerStatus === 'candidate' ? 'headliner candidate' : '',
    activeDevnets.map((devnet) => devnet.id).join(' '),
    complexity ? `${complexity.tier} ${complexity.totalScore}` : 'unassessed',
    clientPriority.label,
    presentationHistory.map((event) => `${event.type} ${event.call ?? ''}`).join(' '),
    priority?.stances.map((stance) => `${stance.clientName} ${stance.rawRating ?? ''}`).join(' ') ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

function compareStages(a: InclusionStage, b: InclusionStage): number {
  return stageRank(a) - stageRank(b);
}

function stageRank(stage: InclusionStage): number {
  const index = EIP_EXPLORER_STAGE_ORDER.indexOf(stage);
  return index === -1 ? EIP_EXPLORER_STAGE_ORDER.length : index;
}

function compareHeadlinerStatus(a: HeadlinerStatus, b: HeadlinerStatus): number {
  const ranks: Record<HeadlinerStatus, number> = {
    selected: 0,
    candidate: 1,
    none: 2,
  };
  return ranks[a] - ranks[b];
}

function compareNullableNumbers(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a - b;
}

function compareLatestDevnetVersion(a: ExplorerDevnetMembership[], b: ExplorerDevnetMembership[]): number {
  const latestA = latestDevnetVersion(a);
  const latestB = latestDevnetVersion(b);
  return compareNullableNumbers(latestA, latestB);
}

function latestDevnetVersion(devnets: ExplorerDevnetMembership[]): number | null {
  if (devnets.length === 0) return null;
  return Math.max(...devnets.map((devnet) => devnet.version));
}
