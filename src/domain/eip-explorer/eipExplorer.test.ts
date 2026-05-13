import { describe, expect, it } from 'vitest';
import type { EipComplexity } from '../complexity/types';
import type { EIP } from '../../types/eip';
import type { EipAggregateStance } from '../../types/prioritization';
import {
  buildEipExplorerItems,
  filterEipExplorerItems,
  sortEipExplorerItems,
  summarizeEipExplorerItems,
  type DevnetCatalogEntry,
  type EipExplorerFilters,
} from './eipExplorer';

const eip = (
  id: number,
  title: string,
  status: 'Proposed' | 'Considered' | 'Scheduled' | 'Declined' | 'Included' | 'Withdrawn',
  options: {
    layer?: 'EL' | 'CL';
    isHeadliner?: boolean;
    wasHeadlinerCandidate?: boolean;
  } = {},
): EIP => ({
  id,
  title,
  status: 'Draft',
  description: `${title} description`,
  author: 'Test Author',
  type: 'Standards Track',
  category: 'Core',
  createdDate: '2026-01-01',
  layer: options.layer,
  forkRelationships: [
    {
      forkName: 'glamsterdam',
      isHeadliner: options.isHeadliner,
      wasHeadlinerCandidate: options.wasHeadlinerCandidate,
      statusHistory: [
        { status: 'Proposed', call: null, date: '2026-01-01' },
        { status, call: 'acde/200', date: '2026-02-01' },
      ],
    },
  ],
});

const complexity = (eipNumber: number, totalScore: number, tier: EipComplexity['tier']): EipComplexity => ({
  eipNumber,
  totalScore,
  tier,
  anchors: [],
  assessmentUrl: `https://example.com/eip-${eipNumber}`,
});

const priority = (
  eipId: number,
  averageScore: number | null,
  counts: { support?: number; neutral?: number; oppose?: number; stances?: number } = {},
): EipAggregateStance => ({
  eipId,
  eipTitle: `EIP-${eipId}`,
  layer: null,
  inclusionStage: 'Unknown',
  averageScore,
  elAverageScore: null,
  clAverageScore: null,
  stanceCount: counts.stances ?? 0,
  elStanceCount: 0,
  clStanceCount: 0,
  supportCount: counts.support ?? 0,
  neutralCount: counts.neutral ?? 0,
  opposeCount: counts.oppose ?? 0,
  stances: [],
});

const devnets: DevnetCatalogEntry[] = [
  {
    id: 'glamsterdam-devnet-2',
    type: 'combined',
    version: 2,
    eips: [7001],
    optionalEips: [7002],
  },
  {
    id: 'glamsterdam-devnet-3',
    type: 'combined',
    version: 3,
    eips: [7001],
  },
  {
    id: 'bal-devnet-6',
    type: 'headliner',
    headliner: 'BAL',
    version: 6,
    eips: [7003],
  },
];

describe('eipExplorer', () => {
  it('joins fork EIPs with active devnets, complexity, priority, and headliner status', () => {
    const items = buildEipExplorerItems({
      eips: [
        eip(7001, 'EIP-7001: Selected feature', 'Scheduled', { layer: 'EL', isHeadliner: true }),
        eip(7002, 'EIP-7002: Optional feature', 'Considered', { layer: 'CL', wasHeadlinerCandidate: true }),
      ],
      forkName: 'glamsterdam',
      devnets,
      activeDevnetIds: new Set(['glamsterdam-devnet-2', 'glamsterdam-devnet-3']),
      complexityMap: new Map([[7001, complexity(7001, 24, 'High')]]),
      priorityAggregates: [priority(7001, 4.5, { support: 3, stances: 3 })],
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      eipId: 7001,
      proposalType: 'EIP',
      title: 'Selected feature',
      stage: 'Scheduled for Inclusion',
      layer: 'EL',
      headlinerStatus: 'selected',
    });
    expect(items[0].activeDevnets.map((devnet) => devnet.id)).toEqual([
      'glamsterdam-devnet-2',
      'glamsterdam-devnet-3',
    ]);
    expect(items[0].complexity?.totalScore).toBe(24);
    expect(items[0].priority?.averageScore).toBe(4.5);
    expect(items[0].clientPriority).toMatchObject({
      tier: 'strong-support',
      label: 'Strong support',
      stanceCount: 3,
    });

    expect(items[1]).toMatchObject({
      eipId: 7002,
      headlinerStatus: 'candidate',
      complexity: null,
    });
    expect(items[1].activeDevnets).toMatchObject([{ id: 'glamsterdam-devnet-2', optional: true }]);
  });

  it('filters active, denied, signal, layer, stage, and search boundaries', () => {
    const items = buildEipExplorerItems({
      eips: [
        eip(7001, 'EIP-7001: High complexity', 'Scheduled', { layer: 'EL', isHeadliner: true }),
        eip(7002, 'EIP-7002: Declined risk', 'Declined', { layer: 'CL' }),
        eip(7003, 'EIP-7003: Contested BAL item', 'Considered', { layer: 'EL' }),
      ],
      forkName: 'glamsterdam',
      devnets,
      activeDevnetIds: new Set(['bal-devnet-6']),
      complexityMap: new Map([[7001, complexity(7001, 20, 'High')]]),
      priorityAggregates: [
        priority(7001, 4, { support: 2, stances: 2 }),
        priority(7003, 2.5, { support: 1, oppose: 1, stances: 2 }),
      ],
    });

    const defaults: EipExplorerFilters = {
      query: '',
      layer: 'all',
      signal: 'all',
      stage: 'active',
    };

    expect(filterEipExplorerItems(items, defaults).map((item) => item.eipId)).toEqual([7001, 7003]);
    expect(filterEipExplorerItems(items, { ...defaults, stage: 'Declined for Inclusion' }).map((item) => item.eipId)).toEqual([7002]);
    expect(filterEipExplorerItems(items, { ...defaults, signal: 'active-devnet' }).map((item) => item.eipId)).toEqual([7003]);
    expect(filterEipExplorerItems(items, { ...defaults, signal: 'high-complexity' }).map((item) => item.eipId)).toEqual([7001]);
    expect(filterEipExplorerItems(items, { ...defaults, signal: 'contested' }).map((item) => item.eipId)).toEqual([7003]);
    expect(filterEipExplorerItems(items, { ...defaults, layer: 'CL', stage: 'all' }).map((item) => item.eipId)).toEqual([7002]);
    expect(filterEipExplorerItems(items, { ...defaults, query: 'bal' }).map((item) => item.eipId)).toEqual([7003]);
  });

  it('sorts stages in PFI to CFI to SFI to DFI decision order', () => {
    const items = buildEipExplorerItems({
      eips: [
        eip(7001, 'EIP-7001: Scheduled feature', 'Scheduled'),
        eip(7002, 'EIP-7002: Considered feature', 'Considered'),
        eip(7003, 'EIP-7003: Declined item', 'Declined'),
        eip(7004, 'EIP-7004: Proposed feature', 'Proposed'),
      ],
      forkName: 'glamsterdam',
      devnets,
      activeDevnetIds: new Set(),
      complexityMap: new Map(),
      priorityAggregates: [],
    });

    expect(sortEipExplorerItems(items, { key: 'stage', direction: 'asc' }).map((item) => item.eipId)).toEqual([
      7004,
      7002,
      7001,
      7003,
    ]);
  });

  it('sorts and summarizes the explorer model', () => {
    const items = buildEipExplorerItems({
      eips: [
        eip(7001, 'EIP-7001: High complexity', 'Scheduled', { isHeadliner: true }),
        eip(7002, 'EIP-7002: Low complexity', 'Considered'),
        eip(7003, 'EIP-7003: Declined item', 'Declined'),
      ],
      forkName: 'glamsterdam',
      devnets,
      activeDevnetIds: new Set(['glamsterdam-devnet-2', 'glamsterdam-devnet-3']),
      complexityMap: new Map([
        [7001, complexity(7001, 25, 'High')],
        [7002, complexity(7002, 4, 'Low')],
      ]),
      priorityAggregates: [
        priority(7001, 4.5, { support: 2, stances: 2 }),
        priority(7002, 2, { oppose: 1, stances: 1 }),
      ],
    });

    expect(sortEipExplorerItems(items, { key: 'complexity', direction: 'desc' }).map((item) => item.eipId)).toEqual([
      7001,
      7002,
      7003,
    ]);
    expect(sortEipExplorerItems(items, { key: 'devnets', direction: 'desc' }).map((item) => item.eipId)).toEqual([
      7001,
      7002,
      7003,
    ]);
    expect(sortEipExplorerItems(items, { key: 'client-priority', direction: 'desc' }).map((item) => item.eipId)).toEqual([
      7001,
      7002,
      7003,
    ]);
    expect(items.map((item) => item.clientPriority.tier)).toEqual(['strong-support', 'low-support', 'no-signal']);

    expect(summarizeEipExplorerItems(items)).toMatchObject({
      total: 3,
      active: 2,
      denied: 1,
      selectedHeadliners: 1,
      inActiveDevnet: 2,
      highComplexity: 1,
      unassessed: 1,
    });
  });
});
