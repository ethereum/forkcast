import { describe, expect, it } from 'vitest';
import {
  getEipIdFromHash,
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

describe('getEipIdFromHash', () => {
  it('parses EIP anchor hashes', () => {
    expect(getEipIdFromHash('#eip-8011')).toBe(8011);
  });

  it('ignores non-EIP hashes', () => {
    expect(getEipIdFromHash('#declined-for-inclusion')).toBeNull();
    expect(getEipIdFromHash('eip-8011')).toBeNull();
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
