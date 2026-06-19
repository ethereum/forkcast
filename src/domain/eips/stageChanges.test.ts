import { describe, expect, it } from 'vitest';
import type { EIP, ForkRelationship } from '../../types/eip';
import { buildEipStageChangesPayload, getRecentStageChanges } from './stageChanges';

type StatusEntry = ForkRelationship['statusHistory'][number];

const entry = (status: StatusEntry['status'], date: string | null): StatusEntry => ({
  status,
  call: null,
  date,
});

const fork = (forkName: string, statusHistory: StatusEntry[]): ForkRelationship => ({
  forkName,
  statusHistory,
});

const makeEip = (overrides: Partial<EIP> & Pick<EIP, 'id' | 'title'>): EIP => ({
  status: 'Draft',
  description: 'technical description',
  author: 'someone',
  type: 'Standards Track',
  createdDate: '2024-01-01',
  forkRelationships: [],
  ...overrides,
});

describe('getRecentStageChanges', () => {
  it('reports lastStageChange from the most recent dated entry but currentStage from the fork\'s last entry', () => {
    // The most recent *dated* entry sets the date; the current stage is the last
    // entry of that fork even when a later entry carries no date.
    const eip = makeEip({
      id: 7777,
      title: 'EIP-7777: Trailing undated stage',
      forkRelationships: [
        fork('Glamsterdam', [entry('Proposed', '2025-01-10'), entry('Scheduled', null)]),
      ],
    });

    const [change] = getRecentStageChanges([eip]);

    expect(change.lastStageChange).toBe('2025-01-10');
    expect(change.currentStage).toBe('Scheduled');
    expect(change.lastStageChangeFork).toBe('Glamsterdam');
  });

  it('selects the fork with the most recent dated entry across all forks', () => {
    const eip = makeEip({
      id: 4242,
      title: 'EIP-4242: Cross-fork selection',
      forkRelationships: [
        // The winning fork (most recent dated entry) is intentionally NOT last in
        // the array, so this also guards the most-recent-dated-fork lookup against a
        // regression that reads the last array element instead.
        fork('Glamsterdam', [entry('Proposed', '2025-03-01'), entry('Considered', '2025-03-15')]),
        // Earlier-dated entry in a different fork must not win.
        fork('Fusaka', [entry('Included', '2024-05-01')]),
      ],
    });

    const [change] = getRecentStageChanges([eip]);

    expect(change.lastStageChange).toBe('2025-03-15');
    expect(change.lastStageChangeFork).toBe('Glamsterdam');
    expect(change.currentStage).toBe('Considered');
  });

  it('orders results by most recent change and respects count', () => {
    const older = makeEip({
      id: 1,
      title: 'EIP-1: Older',
      forkRelationships: [fork('Fusaka', [entry('Included', '2025-01-10')])],
    });
    const newer = makeEip({
      id: 2,
      title: 'EIP-2: Newer',
      forkRelationships: [fork('Glamsterdam', [entry('Considered', '2025-03-15')])],
    });

    expect(getRecentStageChanges([older, newer]).map((c) => c.id)).toEqual([2, 1]);
    expect(getRecentStageChanges([older, newer], 1).map((c) => c.id)).toEqual([2]);
  });

  it('orders same-date changes by EIP id for deterministic output', () => {
    const higherId = makeEip({
      id: 2,
      title: 'EIP-2: Higher',
      forkRelationships: [fork('Glamsterdam', [entry('Considered', '2025-03-15')])],
    });
    const lowerId = makeEip({
      id: 1,
      title: 'EIP-1: Lower',
      forkRelationships: [fork('Glamsterdam', [entry('Considered', '2025-03-15')])],
    });

    expect(getRecentStageChanges([higherId, lowerId]).map((c) => c.id)).toEqual([1, 2]);
  });

  it('skips EIPs whose status history has no dated entry', () => {
    const eip = makeEip({
      id: 9,
      title: 'EIP-9: Undated only',
      forkRelationships: [fork('Glamsterdam', [entry('Proposed', null)])],
    });

    expect(getRecentStageChanges([eip])).toEqual([]);
  });

  it('strips the prefix from the title, detects RIP, and prefers the layman description', () => {
    const rip = makeEip({
      id: 7212,
      title: 'RIP-7212: Precompile for secp256r1',
      laymanDescription: 'A friendly summary',
      description: 'tech',
      forkRelationships: [fork('Fusaka', [entry('Included', '2025-02-01')])],
    });

    const [change] = getRecentStageChanges([rip]);

    expect(change.title).toBe('Precompile for secp256r1');
    expect(change.prefix).toBe('RIP');
    expect(change.description).toBe('A friendly summary');
    expect(change.url).toBe('/eips/7212');
  });
});

describe('buildEipStageChangesPayload', () => {
  it('wraps the selection with the generated timestamp and honors count', () => {
    const eips = [
      makeEip({ id: 1, title: 'EIP-1: A', forkRelationships: [fork('Fusaka', [entry('Included', '2025-01-01')])] }),
      makeEip({ id: 2, title: 'EIP-2: B', forkRelationships: [fork('Glamsterdam', [entry('Considered', '2025-02-01')])] }),
    ];

    const payload = buildEipStageChangesPayload(eips, '2025-03-01T00:00:00.000Z', 1);

    expect(payload.generatedAt).toBe('2025-03-01T00:00:00.000Z');
    expect(payload.eips.map((e) => e.id)).toEqual([2]);
  });
});
