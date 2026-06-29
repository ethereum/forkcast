import { describe, expect, it } from 'vitest';
import type { ForkRelationship } from '../../types/eip';
import {
  getCurrentHeadlinerCandidacyState,
  getLatestHeadlinerCall,
  hasActiveHeadlinerCandidacy,
} from './headlinerHistory';

const fork = (headlinerHistory: ForkRelationship['headlinerHistory']): ForkRelationship => ({
  forkName: 'Glamsterdam',
  statusHistory: [],
  headlinerHistory,
});

describe('headlinerHistory', () => {
  it('derives active candidacy from the latest candidacy state', () => {
    const withdrawnThenReproposed = fork([
      { type: 'proposed', date: '2026-01-01', link: 'https://example.com/proposal' },
      { type: 'withdrawn', date: '2026-01-15' },
      { type: 'proposed', date: '2026-01-22', link: 'https://example.com/reproposal' },
    ]);

    expect(getCurrentHeadlinerCandidacyState(withdrawnThenReproposed)).toMatchObject({ type: 'proposed' });
    expect(hasActiveHeadlinerCandidacy(withdrawnThenReproposed)).toBe(true);
  });

  it('finds the latest headliner event with a call reference', () => {
    const relationship = fork([
      { type: 'presented', date: '2026-01-08', call: 'acde/229' },
      { type: 'withdrawn', date: '2026-01-15', call: 'acdc/174', timestamp: 120 },
    ]);

    expect(getLatestHeadlinerCall(relationship)).toEqual({
      type: 'withdrawn',
      date: '2026-01-15',
      call: 'acdc/174',
      timestamp: 120,
    });
  });
});
