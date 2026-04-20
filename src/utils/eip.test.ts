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
  it('uses laymanDescription when present', () => {
    const eip = makeEip({
      description: 'Technical fallback',
      laymanDescription: 'Reader-friendly summary',
    });

    expect(getSummaryDescription(eip)).toBe('Reader-friendly summary');
  });

  it('falls back to description when laymanDescription is missing', () => {
    const eip = makeEip({
      description: 'Technical fallback',
      laymanDescription: undefined,
    });

    expect(getSummaryDescription(eip)).toBe('Technical fallback');
  });
});
