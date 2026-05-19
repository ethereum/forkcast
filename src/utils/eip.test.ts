import { describe, expect, it } from 'vitest';
import {
  getEipIdFromHash,
  getInclusionStageSortRank,
  getStageAbbreviation,
  getSummaryDescription,
  getUpgradeAnchorExpansionState,
} from './eip';
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

describe('getEipIdFromHash', () => {
  it('parses EIP anchor hashes', () => {
    expect(getEipIdFromHash('#eip-8011')).toBe(8011);
  });

  it('ignores non-EIP hashes', () => {
    expect(getEipIdFromHash('#declined-for-inclusion')).toBeNull();
    expect(getEipIdFromHash('eip-8011')).toBeNull();
    expect(getEipIdFromHash('#eip-8011-extra')).toBeNull();
  });

  it('ignores unsafe EIP numbers', () => {
    expect(getEipIdFromHash('#eip-9007199254740993')).toBeNull();
  });
});

describe('getUpgradeAnchorExpansionState', () => {
  it('expands the declined section for declined EIP anchors', () => {
    const eip = makeEip({
      forkRelationships: [
        {
          forkName: 'Glamsterdam',
          statusHistory: [
            { status: 'Proposed', call: null, date: null },
            { status: 'Declined', call: 'acde/225', date: '2025-12-04' },
          ],
        },
      ],
    });

    expect(getUpgradeAnchorExpansionState(eip, 'Glamsterdam')).toEqual({
      declined: true,
      headlinerProposals: false,
    });
  });

  it('expands headliner proposals for headliner candidate anchors', () => {
    const eip = makeEip({
      forkRelationships: [
        {
          forkName: 'Glamsterdam',
          wasHeadlinerCandidate: true,
          isHeadliner: false,
          statusHistory: [
            { status: 'Considered', call: null, date: null },
            { status: 'Declined', call: 'acdc/171', date: '2025-12-11' },
          ],
        },
      ],
    });

    expect(getUpgradeAnchorExpansionState(eip, 'Glamsterdam')).toEqual({
      declined: true,
      headlinerProposals: true,
    });
  });
});
