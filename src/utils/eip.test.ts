import { describe, expect, it } from 'vitest';
import { getSummaryDescription } from './eip';
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
