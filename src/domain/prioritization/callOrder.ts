/**
 * The order a facilitator means to take the board in, as EIP ids. It is a whole
 * arrangement rather than a set of pinned rows: a move is always made against the order
 * already on screen, so the first one captures that view and every later one adjusts it.
 */
export type CallOrder = number[];

/** Per fork, so an order drawn up for one upgrade never applies to another. */
export const orderStorageKey = (fork: string): string =>
  `forkcast:call-order:${fork.toLowerCase()}`;

/**
 * Reads back a stored order, keeping the EIP ids and only the first mention of each. The
 * store is restored mid-call, so a hand-edited or stale value has to be ignored rather
 * than throw.
 */
export function parseOrder(raw: string | null): CallOrder {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const placed = new Set<number>();
  for (const value of parsed) {
    if (typeof value === 'number' && Number.isInteger(value)) placed.add(value);
  }
  return [...placed];
}

/**
 * Folds the rows now on screen into a stored order: anything it has never placed goes to
 * the end, in whatever the table is sorted by. Rows it holds that the filters are hiding
 * stay put, so narrowing the board and widening it again doesn't cost the arrangement.
 */
export function reconcileOrder(order: CallOrder, visible: readonly number[]): CallOrder {
  const placed = new Set(order);
  const added = visible.filter((eipId) => !placed.has(eipId));
  return added.length > 0 ? [...order, ...added] : order;
}

/**
 * Puts one row in another's place: the moved row takes the slot the target was in and
 * everything between them shifts by one, which is what dragging a list looks like from
 * the outside.
 */
export function moveTo(order: CallOrder, eipId: number, targetId: number): CallOrder {
  const from = order.indexOf(eipId);
  const to = order.indexOf(targetId);
  if (from === -1 || to === -1 || from === to) return order;

  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, eipId);
  return next;
}

/**
 * One step up or down the board, for moving a row from the keyboard. It aims at the
 * neighbour on screen rather than at the next slot in the order, so a row the filters are
 * hiding is stepped over rather than swapped with invisibly. Stops at the ends.
 */
export function moveByVisible(
  order: CallOrder,
  eipId: number,
  delta: number,
  visible: readonly number[]
): CallOrder {
  const at = visible.indexOf(eipId);
  if (at === -1) return order;
  const neighbour = visible[at + delta];
  if (neighbour === undefined) return order;
  return moveTo(order, eipId, neighbour);
}

/**
 * Lays an arrangement over a sorted list. A row the order has never placed follows the
 * ones it has, keeping the sort's own order among those.
 */
export function applyOrder<T>(
  items: T[],
  order: CallOrder,
  idOf: (item: T) => number
): T[] {
  if (order.length === 0) return items;
  const rank = new Map(order.map((eipId, index) => [eipId, index]));
  const rankOf = (item: T) => rank.get(idOf(item)) ?? order.length;
  return [...items].sort((a, b) => rankOf(a) - rankOf(b));
}
