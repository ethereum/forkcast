import { describe, expect, it } from 'vitest';
import { withRecent } from './recentSearches';

describe('withRecent', () => {
  it('puts the newest href first', () => {
    expect(withRecent(['/a', '/b'], '/c')).toEqual(['/c', '/a', '/b']);
  });

  it('moves a repeat visit back to the front instead of duplicating it', () => {
    expect(withRecent(['/a', '/b', '/c'], '/c')).toEqual(['/c', '/a', '/b']);
  });

  it('stores the route only, so a summary hit resolves back to its call', () => {
    expect(withRecent([], '/calls/acde/246?search=blob&timestamp=120&type=agenda')).toEqual([
      '/calls/acde/246',
    ]);
    expect(withRecent([], '/eips/7732?tab=faq')).toEqual(['/eips/7732']);
  });

  it('collapses two searches into the same page onto one entry', () => {
    expect(withRecent(['/calls/acde/246?search=blob'], '/calls/acde/246?search=pq')).toEqual([
      '/calls/acde/246',
    ]);
  });

  it('keeps twelve, so a scoped launcher still has rows to draw on', () => {
    const hrefs = Array.from({ length: 12 }, (_, i) => `/page/${i}`);
    const next = withRecent(hrefs, '/new');

    expect(next).toHaveLength(12);
    expect(next[0]).toBe('/new');
    expect(next).not.toContain('/page/11');
  });
});
