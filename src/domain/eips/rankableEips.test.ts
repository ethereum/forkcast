import { describe, expect, it } from 'vitest';
import type { EIP, ForkRelationship } from '../../types/eip';
import { getRankableEips } from './rankableEips';

type StatusEntry = ForkRelationship['statusHistory'][number];

const hegota = (
  status: StatusEntry['status'],
  extras: Partial<ForkRelationship> = {}
): ForkRelationship => ({
  forkName: 'Hegota',
  statusHistory: [{ status, call: null, date: null }],
  ...extras,
});

const makeEip = (overrides: Partial<EIP> & Pick<EIP, 'id'>): EIP => ({
  title: `EIP-${overrides.id}`,
  status: 'Draft',
  description: '',
  author: 'someone',
  type: 'Standards Track',
  createdDate: '2026-01-01',
  forkRelationships: [hegota('Proposed')],
  ...overrides,
});

describe('getRankableEips', () => {
  it('keeps Proposed and Considered Standards Track EIPs', () => {
    const proposed = makeEip({ id: 1 });
    const considered = makeEip({ id: 2, forkRelationships: [hegota('Considered')] });

    expect(getRankableEips([proposed, considered]).map(e => e.id)).toEqual([1, 2]);
  });

  it('omits Informational EIPs even when they are still Proposed', () => {
    const spec = makeEip({ id: 1 });
    const info = makeEip({ id: 8173, type: 'Informational' });

    expect(getRankableEips([spec, info]).map(e => e.id)).toEqual([1]);
  });

  it('omits headliners, Scheduled EIPs, and other forks', () => {
    const headliner = makeEip({ id: 3, forkRelationships: [hegota('Proposed', { isHeadliner: true })] });
    const scheduled = makeEip({ id: 4, forkRelationships: [hegota('Scheduled')] });
    const otherFork = makeEip({
      id: 5,
      forkRelationships: [{ forkName: 'Glamsterdam', statusHistory: [{ status: 'Proposed', call: null, date: null }] }],
    });

    expect(getRankableEips([headliner, scheduled, otherFork])).toEqual([]);
  });
});
