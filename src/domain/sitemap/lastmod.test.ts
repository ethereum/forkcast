import { describe, expect, it } from 'vitest';
import { buildLastmodMap, toLastmod } from './lastmod';

describe('buildLastmodMap', () => {
  const sources = {
    calls: [
      { path: 'acdc/184', date: '2026-01-15' },
      { path: 'acde/244', date: '2026-08-27' },
    ],
    stageChanges: [
      { id: 7702, lastStageChange: '2025-03-06' },
      { id: 7928, lastStageChange: '2026-02-11' },
    ],
  };

  it('keys routes in the trailing-slash form the sitemap publishes', () => {
    const map = buildLastmodMap(sources);
    expect(map.get('/calls/acdc/184/')).toBe('2026-01-15');
    expect(map.get('/eips/7702/')).toBe('2025-03-06');
  });

  it('leaves undated routes out rather than inventing a date', () => {
    const map = buildLastmodMap(sources);
    expect(map.has('/eips/')).toBe(false);
    expect(map.has('/')).toBe(false);
  });

  it('skips entries whose own date is missing', () => {
    const map = buildLastmodMap({
      calls: [{ path: 'acdc/999', date: '' }],
      stageChanges: [{ id: 1, lastStageChange: '' }],
    });
    expect(map.size).toBe(0);
  });
});

describe('toLastmod', () => {
  it('expands a plain date to a W3C datetime', () => {
    expect(toLastmod('2026-01-15')).toBe('2026-01-15T00:00:00.000Z');
  });

  it('returns undefined for a missing or unparseable date', () => {
    expect(toLastmod(undefined)).toBeUndefined();
    expect(toLastmod('not-a-date')).toBeUndefined();
  });
});
