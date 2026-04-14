import { describe, expect, it } from 'vitest';
import { getCallNavigation } from './calls';

describe('getCallNavigation', () => {
  it('uses the viewer local day instead of UTC day', () => {
    const navigation = getCallNavigation('epbs', new Date('2025-12-19T07:30:00Z'), 'America/Los_Angeles');

    expect(navigation.previous?.number).toBe('028');
    expect(navigation.next?.number).toBe('029');
  });
});
