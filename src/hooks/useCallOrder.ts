import { useCallback, useEffect, useState } from 'react';
import {
  CallOrder,
  moveByVisible,
  moveTo,
  orderStorageKey,
  parseOrder,
  reconcileOrder,
} from '../domain/prioritization/callOrder';

interface UseCallOrderResult {
  /** Empty until the facilitator has moved something, which is what turns the order on. */
  order: CallOrder;
  /** Drops `eipId` onto `targetId`'s row. */
  move: (eipId: number, targetId: number, visible: readonly number[]) => void;
  /** Steps `eipId` one row up (-1) or down (+1) the board as it is on screen. */
  nudge: (eipId: number, delta: number, visible: readonly number[]) => void;
  clear: () => void;
}

/**
 * The running order one fork's board is to be taken in. Like the decisions logged against
 * it, it is held on the machine that drew it up: an agenda is often arranged before the
 * call and a refresh partway through must not scatter it.
 */
export function useCallOrder(fork: string): UseCallOrderResult {
  const [order, setOrder] = useState<CallOrder>([]);

  // Read after mount rather than in the initializer: the store is per fork, so switching
  // forks has to reload it, and one effect covers both cases.
  useEffect(() => {
    try {
      setOrder(parseOrder(localStorage.getItem(orderStorageKey(fork))));
    } catch {
      setOrder([]);
    }
  }, [fork]);

  /**
   * Writes through on the way to the new state. A separate effect keyed on `order` would
   * fire once with the previous fork's arrangement under the new fork's key.
   */
  const update = useCallback(
    (next: (prev: CallOrder) => CallOrder) => {
      setOrder((prev) => {
        const value = next(prev);
        try {
          localStorage.setItem(orderStorageKey(fork), JSON.stringify(value));
        } catch {
          // Unwritable storage (private mode, quota) still leaves the order on screen.
        }
        return value;
      });
    },
    [fork]
  );

  /** Every move runs against the rows on screen, so an empty store starts as that view. */
  const edit = useCallback(
    (visible: readonly number[], change: (order: CallOrder) => CallOrder) =>
      update((prev) => change(reconcileOrder(prev, visible))),
    [update]
  );

  const move = useCallback(
    (eipId: number, targetId: number, visible: readonly number[]) =>
      edit(visible, (prev) => moveTo(prev, eipId, targetId)),
    [edit]
  );

  const nudge = useCallback(
    (eipId: number, delta: number, visible: readonly number[]) =>
      edit(visible, (prev) => moveByVisible(prev, eipId, delta, visible)),
    [edit]
  );

  const clear = useCallback(() => update(() => []), [update]);

  return { order, move, nudge, clear };
}
