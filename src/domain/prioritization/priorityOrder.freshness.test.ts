import { describe, expect, it } from 'vitest';
import { getPriorityOrder, priorityOrderDrift } from './priorityOrder';
import { eipsData } from '../../data/eips';

/**
 * Whether each published priority order still describes the board it ranks.
 *
 * Held apart from the unit suite because it fails when ACD moves an EIP, not when anyone's
 * code is wrong, and the deploy workflow gates on `test:unit`. A failure here means the
 * checked-in list needs republishing from its source, which `npm run audit-eips` spells
 * out alongside whatever the source itself has changed.
 */
describe('published priority orders', () => {
  const orders = ['hegota'].map((fork) => [fork, getPriorityOrder(fork)!] as const);

  it.each(orders)('%s still matches the board it was drawn up against', (_fork, order) => {
    for (const layer of order.layers) {
      expect(priorityOrderDrift(order, layer, eipsData), layer.layer).toEqual({
        moved: [],
        unplaced: [],
      });
    }
  });
});
