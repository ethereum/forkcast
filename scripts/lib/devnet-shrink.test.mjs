import { describe, expect, it } from 'vitest';
import { findShrinkage } from './devnet-shrink.mjs';

const eips = (n) => Array.from({ length: n }, (_, i) => ({ number: 7000 + i }));
const matrix = (n) => ({ clients: ['geth'], matrix: Array.from({ length: n }, () => ({})) });

const spec = ({ e = 6, el = 4, cl = 4, refs = true } = {}) => ({
  eips: eips(e),
  elClientSupport: matrix(el),
  clClientSupport: matrix(cl),
  specReferences: refs
    ? { consensusSpecs: { version: 'v1' }, executionSpecs: { version: 'v2' } }
    : { consensusSpecs: null, executionSpecs: null },
});

describe('findShrinkage', () => {
  it('accepts an identical or growing spec', () => {
    expect(findShrinkage(spec(), spec())).toEqual([]);
    expect(findShrinkage(spec(), spec({ e: 9, el: 6 }))).toEqual([]);
  });

  it('accepts losing up to half of a list', () => {
    expect(findShrinkage(spec({ e: 6 }), spec({ e: 3 }))).toEqual([]);
  });

  it('flags a parse that loses most EIPs', () => {
    expect(findShrinkage(spec({ e: 6 }), spec({ e: 2 }))).toEqual(['EIPs: 6 -> 2']);
  });

  it('flags every list that came back empty', () => {
    expect(findShrinkage(spec(), spec({ e: 0, el: 0, cl: 0, refs: false }))).toEqual([
      'EIPs: 6 -> 0',
      'EL client support rows: 4 -> 0',
      'CL client support rows: 4 -> 0',
      'spec references: 2 -> 0',
    ]);
  });

  it('ignores lists that were already tiny or empty', () => {
    expect(findShrinkage(spec({ e: 1, el: 0 }), spec({ e: 0, el: 0 }))).toEqual([]);
  });

  it('tolerates missing sections in either spec', () => {
    expect(findShrinkage({}, spec())).toEqual([]);
    expect(findShrinkage(spec({ el: 0, cl: 0 }), { eips: eips(6) })).toEqual([
      'spec references: 2 -> 0',
    ]);
  });
});
