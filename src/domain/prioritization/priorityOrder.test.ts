import { describe, it, expect } from 'vitest';
import {
  formatPriorityOrder,
  getPriorityOrder,
  groupPairedEntries,
  priorityOrderDrift,
  type PriorityOrder,
  type PriorityOrderLayer,
} from './priorityOrder';
import { parsePublishedOrder } from '../../../scripts/lib/priority-order.mjs';
import { eipsData } from '../../data/eips';
import type { EIP } from '../../types/eip';

const eip = (id: number, layer: 'EL' | 'CL', status: string): EIP =>
  ({
    id,
    layer,
    forkRelationships: [{ forkName: 'Hegota', statusHistory: [{ status }] }],
  }) as unknown as EIP;

const order = (layer: PriorityOrderLayer): PriorityOrder => ({
  fork: 'Hegota',
  lastUpdated: '2026-10-22',
  source: { label: 'list', url: 'https://example.com' },
  layers: [layer],
});

describe('getPriorityOrder', () => {
  it('finds a fork however its name is cased, and nothing for a fork without one', () => {
    expect(getPriorityOrder('Hegota')?.fork).toBe('Hegota');
    expect(getPriorityOrder('hegota')?.fork).toBe('Hegota');
    expect(getPriorityOrder('glamsterdam')).toBeNull();
  });
});

describe('groupPairedEntries', () => {
  it('leaves entries that pair with nothing on their own', () => {
    expect(groupPairedEntries([{ eipId: 1 }, { eipId: 2 }])).toEqual([
      { entries: [{ eipId: 1 }], fromRank: 1, toRank: 1 },
      { entries: [{ eipId: 2 }], fromRank: 2, toRank: 2 },
    ]);
  });

  it('collapses a neighbouring pair into one unit spanning both ranks', () => {
    const entries = [
      { eipId: 1 },
      { eipId: 2, pairedWith: [3] },
      { eipId: 3, pairedWith: [2] },
    ];
    expect(groupPairedEntries(entries)).toEqual([
      { entries: [entries[0]], fromRank: 1, toRank: 1 },
      { entries: [entries[1], entries[2]], fromRank: 2, toRank: 3 },
    ]);
  });

  it('keeps a pair the list has split apart split', () => {
    const entries = [{ eipId: 2, pairedWith: [4] }, { eipId: 3 }, { eipId: 4, pairedWith: [2] }];
    expect(groupPairedEntries(entries).map((group) => group.entries.length)).toEqual([1, 1, 1]);
  });

  it('takes a run of three that pair through each other as one unit', () => {
    const entries = [
      { eipId: 1, pairedWith: [2] },
      { eipId: 2, pairedWith: [1, 3] },
      { eipId: 3, pairedWith: [2] },
    ];
    expect(groupPairedEntries(entries)).toEqual([{ entries, fromRank: 1, toRank: 3 }]);
  });
});

describe('formatPriorityOrder', () => {
  const titleFor = (eipId: number) => `Title ${eipId}`;

  it('writes the ranking as the source list shapes it', () => {
    const published = order({
      layer: 'EL',
      entries: [
        { eipId: 1 },
        { eipId: 2, tag: 'Frames-core', pairedWith: [3], note: 'Both or neither.' },
        { eipId: 3, pairedWith: [2] },
      ],
    });
    published.watching = [{ eipId: 9, note: 'Still PFI.' }];

    expect(formatPriorityOrder(published, titleFor, 'https://forkcast.org')).toBe(
      [
        '# Hegota priority order',
        '',
        'Published 2026-10-22 · source: https://example.com',
        '',
        '## EIPs',
        '',
        '1. [EIP-1](https://forkcast.org/eips/1/): Title 1',
        '2. [EIP-2](https://forkcast.org/eips/2/): Title 2. _Reviewed with EIP-3. Frames-core. Both or neither._',
        '3. [EIP-3](https://forkcast.org/eips/3/): Title 3. _Reviewed with EIP-2_',
        '',
        '## Notes',
        '',
        '- [EIP-9](https://forkcast.org/eips/9/): Title 9. _Still PFI._',
        '',
        'Copied from https://forkcast.org/upgrade/hegota/priority-order/',
      ].join('\n')
    );
  });

  it('names each layer once there is more than one', () => {
    const published = order({ layer: 'EL', entries: [{ eipId: 1 }] });
    published.layers.push({ layer: 'CL', entries: [{ eipId: 2 }] });
    const markdown = formatPriorityOrder(published, titleFor, 'https://forkcast.org');
    expect(markdown).toContain('## EL EIPs');
    expect(markdown).toContain('## CL EIPs');
  });

  it('round-trips through the parser the audit script reads it back with', () => {
    const published = order({ layer: 'EL', entries: [{ eipId: 11 }, { eipId: 22 }] });
    published.watching = [{ eipId: 33 }];
    const parsed = parsePublishedOrder(formatPriorityOrder(published, titleFor, 'https://forkcast.org'));
    expect(parsed.ids).toEqual([11, 22]);
    expect(parsed.watching).toEqual([33]);
    expect(parsed.unparsed).toEqual([]);
  });
});

describe('priorityOrderDrift', () => {
  it('reports nothing while the order covers exactly the reviewable EIPs of its layer', () => {
    const layer: PriorityOrderLayer = { layer: 'EL', entries: [{ eipId: 1 }, { eipId: 2 }] };
    const drift = priorityOrderDrift(order(layer), layer, [
      eip(1, 'EL', 'Scheduled'),
      eip(2, 'EL', 'Considered'),
    ]);
    expect(drift).toEqual({ moved: [], unplaced: [] });
  });

  it('flags a placed EIP whose stage has moved on, and one it has never heard of', () => {
    const layer: PriorityOrderLayer = { layer: 'EL', entries: [{ eipId: 1 }, { eipId: 9 }] };
    const drift = priorityOrderDrift(order(layer), layer, [eip(1, 'EL', 'Declined')]);
    expect(drift.moved).toEqual([
      { eipId: 1, stage: 'Declined for Inclusion' },
      { eipId: 9, stage: 'Unknown' },
    ]);
  });

  it('flags a reviewable EIP of its own layer that it does not place', () => {
    const layer: PriorityOrderLayer = { layer: 'EL', entries: [{ eipId: 1 }] };
    const drift = priorityOrderDrift(order(layer), layer, [
      eip(1, 'EL', 'Considered'),
      eip(3, 'EL', 'Considered'),
      eip(4, 'EL', 'Proposed'),
      eip(5, 'CL', 'Considered'),
    ]);
    expect(drift.unplaced).toEqual([3]);
  });
});

describe('the published Hegotá order', () => {
  const published = getPriorityOrder('hegota')!;

  it('places each EIP once, under the layer that EIP data gives it', () => {
    for (const layer of published.layers) {
      const ids = layer.entries.map((entry) => entry.eipId);
      expect(new Set(ids).size).toBe(ids.length);

      for (const id of ids) {
        const match = eipsData.find((candidate) => candidate.id === id);
        expect(match, `EIP-${id} is not in the tracker`).toBeDefined();
        expect(match!.layer, `EIP-${id}`).toBe(layer.layer);
      }
    }
  });

  it('pairs both ways, so neither half of a pair can be reviewed without the other', () => {
    for (const layer of published.layers) {
      const byId = new Map(layer.entries.map((entry) => [entry.eipId, entry]));
      for (const entry of layer.entries) {
        for (const partnerId of entry.pairedWith ?? []) {
          expect(
            byId.get(partnerId)?.pairedWith,
            `EIP-${partnerId} does not pair back to EIP-${entry.eipId}`
          ).toContain(entry.eipId);
        }
      }
    }
  });
});
