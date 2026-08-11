import type { FlatRow } from './types';

const isSelectable = (row: FlatRow | undefined) => Boolean(row) && row!.type !== 'header';

/**
 * Moves the active row by `delta`, skipping section headers and clamping at both
 * ends (no wrap — wrapping past the last result feels like a lost selection).
 */
export function moveIndex(rows: FlatRow[], current: number, delta: number): number {
  if (rows.length === 0) return 0;

  const step = delta > 0 ? 1 : -1;
  let next = current;

  for (let remaining = Math.abs(delta); remaining > 0; remaining -= 1) {
    let candidate = next + step;
    while (candidate >= 0 && candidate < rows.length && !isSelectable(rows[candidate])) {
      candidate += step;
    }
    if (candidate < 0 || candidate >= rows.length) break;
    next = candidate;
  }

  return isSelectable(rows[next]) ? next : firstSelectableIndex(rows);
}

export function firstSelectableIndex(rows: FlatRow[]): number {
  const index = rows.findIndex(isSelectable);
  return index === -1 ? 0 : index;
}
