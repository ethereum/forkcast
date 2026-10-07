import { describe, it, expect } from 'vitest';
import {
  applyOrder,
  moveByVisible,
  moveTo,
  orderStorageKey,
  parseOrder,
  reconcileOrder,
} from './callOrder';

describe('parseOrder', () => {
  it('reads back a stored arrangement', () => {
    expect(parseOrder(JSON.stringify([7702, 4844, 7805]))).toEqual([7702, 4844, 7805]);
  });

  it('returns nothing for an empty, malformed or wrongly shaped store', () => {
    expect(parseOrder(null)).toEqual([]);
    expect(parseOrder('')).toEqual([]);
    expect(parseOrder('{oops')).toEqual([]);
    expect(parseOrder(JSON.stringify({ 7702: 0 }))).toEqual([]);
  });

  it('drops entries that are not EIP ids, and keeps the first mention of each', () => {
    expect(parseOrder(JSON.stringify([7702, '4844', 7702, 1.5, null, 7805]))).toEqual([
      7702, 7805,
    ]);
  });
});

describe('orderStorageKey', () => {
  it('is per fork, however the fork was cased', () => {
    expect(orderStorageKey('Hegota')).toBe(orderStorageKey('hegota'));
    expect(orderStorageKey('hegota')).not.toBe(orderStorageKey('glamsterdam'));
  });
});

describe('reconcileOrder', () => {
  it('starts an empty arrangement as the board on screen', () => {
    expect(reconcileOrder([], [3, 1, 2])).toEqual([3, 1, 2]);
  });

  it('puts rows it has never placed after the ones it has', () => {
    expect(reconcileOrder([3, 1], [1, 2, 3, 4])).toEqual([3, 1, 2, 4]);
  });

  it('keeps rows the filters are hiding', () => {
    expect(reconcileOrder([3, 1, 2], [1])).toEqual([3, 1, 2]);
  });
});

describe('moveTo', () => {
  it('drops a row onto the slot the target was in, moving down', () => {
    expect(moveTo([1, 2, 3, 4], 1, 3)).toEqual([2, 3, 1, 4]);
  });

  it('drops a row onto the slot the target was in, moving up', () => {
    expect(moveTo([1, 2, 3, 4], 4, 2)).toEqual([1, 4, 2, 3]);
  });

  it('leaves the order alone when either row is not in it, or they are the same row', () => {
    expect(moveTo([1, 2, 3], 1, 1)).toEqual([1, 2, 3]);
    expect(moveTo([1, 2, 3], 9, 2)).toEqual([1, 2, 3]);
    expect(moveTo([1, 2, 3], 2, 9)).toEqual([1, 2, 3]);
  });
});

describe('moveByVisible', () => {
  it('swaps with the next row either way', () => {
    expect(moveByVisible([1, 2, 3], 1, 1, [1, 2, 3])).toEqual([2, 1, 3]);
    expect(moveByVisible([1, 2, 3], 3, -1, [1, 2, 3])).toEqual([1, 3, 2]);
  });

  it('steps over a row the filters are hiding rather than swapping with it', () => {
    expect(moveByVisible([1, 2, 3], 1, 1, [1, 3])).toEqual([2, 3, 1]);
  });

  it('stops at the ends, and ignores a row that is not on screen', () => {
    expect(moveByVisible([1, 2, 3], 1, -1, [1, 2, 3])).toEqual([1, 2, 3]);
    expect(moveByVisible([1, 2, 3], 3, 1, [1, 2, 3])).toEqual([1, 2, 3]);
    expect(moveByVisible([1, 2, 3], 2, 1, [1, 3])).toEqual([1, 2, 3]);
  });
});

describe('applyOrder', () => {
  const idOf = (item: { id: number }) => item.id;
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it('hands the sorted list straight back when nothing has been arranged', () => {
    expect(applyOrder(items, [], idOf)).toBe(items);
  });

  it('lays the arrangement over the list', () => {
    expect(applyOrder(items, [3, 1, 2], idOf).map(idOf)).toEqual([3, 1, 2]);
  });

  it('ignores rows the arrangement holds that the list does not', () => {
    expect(applyOrder(items, [9, 3, 8, 1, 2], idOf).map(idOf)).toEqual([3, 1, 2]);
  });

  it('puts unplaced rows last, in the order the sort gave them', () => {
    const sorted = [{ id: 4 }, { id: 2 }, { id: 5 }, { id: 1 }];
    expect(applyOrder(sorted, [1, 2], idOf).map(idOf)).toEqual([1, 2, 4, 5]);
  });
});
