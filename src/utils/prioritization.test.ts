import { describe, it, expect } from 'vitest';
import { calculateEipAggregate } from './prioritization';
import { ClientStance } from '../types/prioritization';

const stance = (
  clientName: string,
  clientType: ClientStance['clientType'],
  rawRating: string,
  normalizedScore: number | null
): ClientStance => ({
  clientName,
  clientType,
  ratingSystem: 'tier-abcds-reject',
  rawRating,
  normalizedScore,
  sourceUrl: 'https://example.com',
  lastUpdated: '2026-09-07',
});

// Hegotá's 0-4 scale, so score 0 is a rejection request rather than a low priority.
const aggregate = (stances: ClientStance[], counted?: ReadonlySet<string>) =>
  calculateEipAggregate(1234, stances, undefined, 'hegota', counted);

describe('calculateEipAggregate', () => {
  const geth = stance('Geth', 'EL', 'S', 4);
  const teku = stance('Teku', 'CL', 'B', 2);
  const ethlabs = stance('Ethlabs', 'OTHER', 'D', 0);

  it('leaves non-client teams out of the scores by default', () => {
    const agg = aggregate([geth, teku, ethlabs]);

    expect(agg.averageScore).toBe(3);
    expect(agg.stanceCount).toBe(2);
    expect(agg.rejectCount).toBe(0);
  });

  it('folds an opted-in team into the average, the counts and the rejections', () => {
    const agg = aggregate([geth, teku, ethlabs], new Set(['Ethlabs']));

    expect(agg.averageScore).toBe(2);
    expect(agg.stanceCount).toBe(3);
    expect(agg.rejectCount).toBe(1);
    expect(agg.opposeCount).toBe(1);
  });

  it('only counts the teams named, not every non-client team', () => {
    const efp = stance('EF Protocol', 'OTHER', 'S', 4);
    const agg = aggregate([geth, ethlabs, efp], new Set(['EF Protocol']));

    expect(agg.averageScore).toBe(4);
    expect(agg.stanceCount).toBe(2);
    expect(agg.rejectCount).toBe(0);
  });

  it('keeps the per-layer averages layer-pure', () => {
    const agg = aggregate([geth, teku, ethlabs], new Set(['Ethlabs']));

    expect(agg.elAverageScore).toBe(4);
    expect(agg.clAverageScore).toBe(2);
    expect(agg.elStanceCount).toBe(1);
    expect(agg.clStanceCount).toBe(1);
  });

  it('scores a fork whose only stances are opted-in non-client teams', () => {
    const agg = aggregate([ethlabs], new Set(['Ethlabs']));

    expect(agg.averageScore).toBe(0);
    expect(agg.stanceCount).toBe(1);
    expect(agg.elAverageScore).toBeNull();
    expect(agg.clAverageScore).toBeNull();
  });
});
