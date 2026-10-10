import { describe, expect, it } from 'vitest';
import { getHighlightedPhaseIndex } from './timeline';
import type { TimelinePhase } from '../types/timeline';

const phases = (...statuses: TimelinePhase['status'][]) => statuses.map(status => ({ status }));

describe('getHighlightedPhaseIndex', () => {
  it('picks the furthest-along in-progress phase', () => {
    expect(getHighlightedPhaseIndex(phases('completed', 'in-progress', 'upcoming'))).toBe(1);
    expect(getHighlightedPhaseIndex(phases('in-progress', 'in-progress', 'upcoming'))).toBe(1);
  });

  it('falls back to the next upcoming phase between phases', () => {
    expect(getHighlightedPhaseIndex(phases('completed', 'completed', 'upcoming', 'upcoming'))).toBe(2);
  });

  it('falls back to the last phase once every phase is done', () => {
    expect(getHighlightedPhaseIndex(phases('completed', 'completed', 'completed'))).toBe(2);
  });
});
