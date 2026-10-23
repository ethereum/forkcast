import { describe, it, expect } from 'vitest';
import { parsePublishedOrder, reconcileBoard, reconcilePublished } from './priority-order.mjs';

const SOURCE = `# Hegotá EL CFI Priority List

EIP-7723 specifies that facilitators should propose a priority ordering.

## EIPs

1. [EIP-8141](https://eips.ethereum.org/EIPS/eip-8141): Frame Transaction. _Headliner_
2. [EIP-8250](https://eips.ethereum.org/EIPS/eip-8250): Keyed Nonces. _Frames-core_
3. [EIP-7906](https://eips.ethereum.org/EIPS/eip-7906): Transaction Assertions

## Notes
- [7907](https://eips.ethereum.org/EIPS/eip-7907) (Meter Contract Code Size) still PFId
`;

const orderOf = (ids, watching = []) => ({
  fork: 'Hegota',
  source: { url: 'https://example.com' },
  layers: [{ layer: 'EL', entries: ids.map((eipId) => ({ eipId })) }],
  watching: watching.map((eipId) => ({ eipId })),
});

const eip = (id, layer, status) => ({
  id,
  layer,
  forkRelationships: [{ forkName: 'Hegota', statusHistory: [{ status }] }],
});

describe('parsePublishedOrder', () => {
  it('reads the ranked EIPs and the watch list out of the source markdown', () => {
    expect(parsePublishedOrder(SOURCE)).toEqual({
      ids: [8141, 8250, 7906],
      watching: [7907],
      unparsed: [],
    });
  });

  it('ignores EIP numbers in the prose around the list', () => {
    // EIP-7723 is named in the preamble and must not be read as a ranked entry.
    expect(parsePublishedOrder(SOURCE).ids).not.toContain(7723);
  });

  it('reports a ranked line it cannot read rather than dropping it', () => {
    const source = SOURCE.replace('2. [EIP-8250](https://eips.ethereum.org/EIPS/eip-8250)', '2. TBD');
    const parsed = parsePublishedOrder(source);
    expect(parsed.ids).toEqual([8141, 7906]);
    expect(parsed.unparsed).toEqual(['2. TBD: Keyed Nonces. _Frames-core_']);
  });

  it('refuses a source whose layout no longer has a list to read', () => {
    expect(() => parsePublishedOrder('# Title\n\nnothing here')).toThrow(/no "## EIPs" section/);
    expect(() => parsePublishedOrder('## EIPs\n\nTBD')).toThrow(/parsed 0 EIPs/);
  });
});

describe('reconcilePublished', () => {
  const published = (ids, watching = []) => ({ ids, watching, unparsed: [] });

  it('finds nothing to do while the two agree', () => {
    const result = reconcilePublished(orderOf([1, 2, 3]), published([1, 2, 3]));
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.reranked).toEqual([]);
  });

  it('names only the EIP that moved, not everything it displaced', () => {
    const result = reconcilePublished(orderOf([1, 2, 3, 4, 5]), published([5, 1, 2, 3, 4]));
    expect(result.reranked).toEqual([{ eipId: 5, from: 5, to: 1 }]);
  });

  it('separates a rerank from an EIP joining or leaving the list', () => {
    const result = reconcilePublished(orderOf([1, 2, 3]), published([9, 1, 3]));
    expect(result.added).toEqual([9]);
    expect(result.removed).toEqual([2]);
    expect(result.reranked).toEqual([]);
  });

  it('tracks the watch list separately from the ranking', () => {
    const result = reconcilePublished(orderOf([1], [7]), published([1], [8]));
    expect(result.watchingAdded).toEqual([8]);
    expect(result.watchingRemoved).toEqual([7]);
  });
});

describe('reconcileBoard', () => {
  it('finds nothing while the ranking covers the reviewable EIPs of its layer', () => {
    const board = reconcileBoard(orderOf([1, 2]), [
      eip(1, 'EL', 'Scheduled'),
      eip(2, 'EL', 'Considered'),
    ]);
    expect(board).toEqual([{ layer: 'EL', moved: [], unplaced: [] }]);
  });

  it('flags a ranked EIP that has left CFI, and one it has no data for', () => {
    const board = reconcileBoard(orderOf([1, 9]), [eip(1, 'EL', 'Declined')]);
    expect(board[0].moved).toEqual([
      { eipId: 1, status: 'Declined' },
      { eipId: 9, status: 'no EIP data file' },
    ]);
  });

  it('flags a reviewable EIP of its own layer that the ranking has not placed', () => {
    const board = reconcileBoard(orderOf([1]), [
      eip(1, 'EL', 'Considered'),
      eip(3, 'EL', 'Considered'),
      eip(4, 'EL', 'Proposed'),
      eip(5, 'CL', 'Considered'),
    ]);
    expect(board[0].unplaced).toEqual([3]);
  });
});
