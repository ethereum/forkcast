import { describe, expect, it } from 'vitest';
import type { HeadlinerSelection } from '../../types/eip';
import {
  getSelectedHeadlinerIds,
  isHeadlinerSelectionFinalized,
  isSelectedHeadlinerId,
} from './headlinerSelection';

describe('headlinerSelection', () => {
  it('derives selected ids from the fork-level layer slots', () => {
    const selection: HeadlinerSelection = {
      status: 'finalized',
      selected: {
        EL: 7928,
        CL: 7732,
      },
    };

    expect(getSelectedHeadlinerIds(selection)).toEqual([7928, 7732]);
    expect(isSelectedHeadlinerId(selection, 7928)).toBe(true);
    expect(isSelectedHeadlinerId(selection, 7805)).toBe(false);
    expect(isHeadlinerSelectionFinalized(selection)).toBe(true);
  });
});
