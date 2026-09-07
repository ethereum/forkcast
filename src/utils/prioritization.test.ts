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

// Support is the fork's two "Support" tiers and opposition is its bottom rung, so the one
// sentence behind the "contested" stat holds on a 0-4 and a 1-5 scale alike.
describe('support and opposition read off the fork scale', () => {
  it('treats a low priority as neither support nor opposition on the 0-4 scale', () => {
    const agg = aggregate([stance('Geth', 'EL', 'A', 3), stance('Reth', 'EL', 'C', 1)]);

    expect(agg.supportCount).toBe(1);
    expect(agg.neutralCount).toBe(1);
    expect(agg.opposeCount).toBe(0);
  });

  it('counts the bottom rung as opposition on the 0-4 scale', () => {
    const agg = aggregate([stance('Geth', 'EL', 'A', 3), stance('Reth', 'EL', 'D', 0)]);

    expect(agg.supportCount).toBe(1);
    expect(agg.opposeCount).toBe(1);
  });

  it('counts Glamsterdam\'s bottom rung as opposition without dragging in its low priority', () => {
    const glamsterdam = (stances: ClientStance[]) =>
      calculateEipAggregate(1234, stances, undefined, 'glamsterdam');
    const agg = glamsterdam([
      stance('Geth', 'EL', 'A', 4),
      stance('Reth', 'EL', 'C', 2),
      stance('Besu', 'EL', 'D', 1),
    ]);

    expect(agg.supportCount).toBe(1);
    expect(agg.neutralCount).toBe(1);
    expect(agg.opposeCount).toBe(1);
  });
});
