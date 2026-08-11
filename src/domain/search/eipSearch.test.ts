import { describe, expect, it } from 'vitest';
import type { EIP } from '../../types/eip';
import {
  SEARCH_WEIGHTS,
  calculateMatchScore,
  getEipResultPath,
  mergeSpecResults,
  passesFilters,
  searchEips,
  type EipSearchFilters,
} from './eipSearch';

const NO_FILTERS: EipSearchFilters = { forkName: 'all', forkStatus: 'all', layer: 'all' };

const makeEip = (overrides: Partial<EIP> & Pick<EIP, 'id' | 'title'>): EIP =>
  ({
    description: '',
    author: '',
    forkRelationships: [],
    ...overrides,
  }) as EIP;

const EIP_7702 = makeEip({
  id: 7702,
  title: 'EIP-7702: Set EOA account code',
  description: 'Lets EOAs temporarily act as smart contracts.',
  layer: 'EL',
  forkRelationships: [
    { forkName: 'Pectra', statusHistory: [{ status: 'Included', date: '2025-01-01' }] },
  ] as EIP['forkRelationships'],
});

const EIP_ABOUT_7702 = makeEip({
  id: 1234,
  title: 'EIP-1234: Delegation designator registry',
  description: 'Adds a registry of 7702 delegations.',
});

describe('EIP search scoring', () => {
  it('weights an id match above a title match', () => {
    const idHit = calculateMatchScore(EIP_7702, ['7702']);
    const titleHit = calculateMatchScore(EIP_7702, ['account']);

    expect(idHit.score).toBe(SEARCH_WEIGHTS.id);
    expect(titleHit.score).toBe(SEARCH_WEIGHTS.title);
    expect(idHit.score).toBeGreaterThan(titleHit.score);
  });

  it('ranks the EIP whose number matches above one that only mentions it', () => {
    const results = searchEips('7702', [EIP_ABOUT_7702, EIP_7702], NO_FILTERS);
    expect(results.map((result) => result.eip.id)).toEqual([7702, 1234]);
  });

  it('finds an EIP by a community acronym absent from its prose', () => {
    // "ePBS" appears nowhere in 7732's title, description or summary.
    const epbs = makeEip({ id: 7732, title: 'EIP-7732: Enshrined Proposer-Builder Separation' });
    const decoy = makeEip({ id: 8375, title: 'EIP-8375: ePBS Mandatory Burn of Execution Rewards' });

    const results = searchEips('epbs', [decoy, epbs], NO_FILTERS);
    expect(results[0].eip.id).toBe(7732);
    expect(results[0].matchedFields).toContain('alias');
  });

  it('matches aliases whole-term, so "bal" does not hit every "balance"', () => {
    const balances = makeEip({ id: 7251, title: 'EIP-7251: Increase the MAX_EFFECTIVE_BALANCE' });
    expect(calculateMatchScore(balances, ['bal']).matchedFields).not.toContain('alias');
    expect(calculateMatchScore(balances, ['balance']).matchedFields).not.toContain('alias');
  });

  it('scores 1 for a filter-only search so browsing by filter still works', () => {
    expect(calculateMatchScore(EIP_7702, [])).toEqual({ score: 1, matchedFields: [] });
    expect(searchEips('', [EIP_7702], { ...NO_FILTERS, layer: 'EL' })).toHaveLength(1);
  });
});

describe('passesFilters', () => {
  it('passes everything when no filter is set', () => {
    expect(passesFilters(EIP_ABOUT_7702, NO_FILTERS)).toBe(true);
  });

  it('rejects an EIP with no fork relationships once any filter is set', () => {
    expect(passesFilters(EIP_ABOUT_7702, { ...NO_FILTERS, layer: 'EL' })).toBe(false);
    expect(passesFilters(EIP_ABOUT_7702, { ...NO_FILTERS, forkName: 'Pectra' })).toBe(false);
  });

  it('matches fork name, current status and layer', () => {
    expect(passesFilters(EIP_7702, { ...NO_FILTERS, forkName: 'Pectra' })).toBe(true);
    expect(passesFilters(EIP_7702, { ...NO_FILTERS, forkName: 'Fusaka' })).toBe(false);
    expect(passesFilters(EIP_7702, { ...NO_FILTERS, forkStatus: 'Included' })).toBe(true);
    expect(passesFilters(EIP_7702, { ...NO_FILTERS, forkStatus: 'Declined' })).toBe(false);
    expect(passesFilters(EIP_7702, { ...NO_FILTERS, layer: 'CL' })).toBe(false);
  });
});

describe('getEipResultPath', () => {
  it('opens the FAQ tab only when the FAQ was the sole match', () => {
    expect(getEipResultPath({ eip: EIP_7702, matchScore: 8, matchedFields: ['faq'] })).toBe('/eips/7702?tab=faq');
    expect(getEipResultPath({ eip: EIP_7702, matchScore: 58, matchedFields: ['title', 'faq'] })).toBe('/eips/7702');
    expect(getEipResultPath({ eip: EIP_7702, matchScore: 1, matchedFields: [] })).toBe('/eips/7702');
  });
});

describe('mergeSpecResults', () => {
  const eipById = new Map([
    [EIP_7702.id, EIP_7702],
    [EIP_ABOUT_7702.id, EIP_ABOUT_7702],
  ]);

  it('boosts an existing result once and tags it "spec" exactly once', () => {
    const metadata = [{ eip: EIP_7702, matchScore: 50, matchedFields: ['title'] }];
    const merged = mergeSpecResults(
      metadata,
      [
        { eipId: 7702, score: 3 },
        { eipId: 7702, score: 2 },
      ],
      eipById,
      NO_FILTERS,
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].matchScore).toBe(50 + SEARCH_WEIGHTS.description * 0.5 * 2);
    expect(merged[0].matchedFields.filter((field) => field === 'spec')).toEqual(['spec']);
  });

  it('appends spec-only hits, but only those passing the filters', () => {
    const merged = mergeSpecResults([], [{ eipId: 7702, score: 9 }], eipById, NO_FILTERS);
    expect(merged.map((result) => result.eip.id)).toEqual([7702]);
    expect(merged[0].matchedFields).toEqual(['spec']);

    const filtered = mergeSpecResults([], [{ eipId: 1234, score: 9 }], eipById, {
      ...NO_FILTERS,
      forkName: 'Pectra',
    });
    expect(filtered).toEqual([]);
  });
});
