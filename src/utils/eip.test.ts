import { describe, expect, it } from 'vitest';
import { getInclusionStageSortRank, getStageAbbreviation, getSummaryDescription } from './eip';
import type { EIP } from '../types';

const makeEip = (overrides: Partial<EIP> = {}): EIP => ({
  id: 1,
  title: 'EIP-1: Example',
  status: 'Draft',
  description: 'Fallback description',
  author: 'Example Author',
  type: 'Standards Track',
  createdDate: '2026-01-01',
  forkRelationships: [],
  ...overrides,
});

describe('getSummaryDescription', () => {
  it('returns the EIP description', () => {
    const eip = makeEip({
      description: 'The EIP description',
      laymanDescription: 'Reader-friendly summary',
    });

    expect(getSummaryDescription(eip)).toBe('The EIP description');
  });
});

describe('inclusion stage labels', () => {
  it('uses shared labels and ordering for inclusion stages', () => {
    expect(getStageAbbreviation('Scheduled for Inclusion')).toBe('SFI');
    expect(getStageAbbreviation('Considered for Inclusion')).toBe('CFI');
    expect(getStageAbbreviation('Proposed for Inclusion')).toBe('PFI');
    expect(getStageAbbreviation('Included')).toBe('Included');
    expect(getInclusionStageSortRank('Scheduled for Inclusion')).toBeLessThan(
      getInclusionStageSortRank('Proposed for Inclusion')
    );
  });
});
