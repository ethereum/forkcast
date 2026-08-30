import { describe, expect, it } from 'vitest';
import {
  breadcrumbList,
  callVideo,
  eipArticle,
  parseAuthors,
  serializeJsonLd,
  siteGraph,
  youtubeId,
} from './structuredData';

describe('breadcrumbList', () => {
  it('numbers crumbs from 1 and leaves the current page without an item URL', () => {
    const crumbs = breadcrumbList([
      { name: 'Forkcast', url: 'https://forkcast.org/' },
      { name: 'EIPs', url: 'https://forkcast.org/eips/' },
      { name: 'EIP-7702' },
    ]) as { itemListElement: Array<Record<string, unknown>> };
    expect(crumbs.itemListElement.map((c) => c.position)).toEqual([1, 2, 3]);
    expect(crumbs.itemListElement[1].item).toBe('https://forkcast.org/eips/');
    expect(crumbs.itemListElement[2]).not.toHaveProperty('item');
  });
});

describe('parseAuthors', () => {
  it('keeps names and drops handles and emails', () => {
    expect(parseAuthors('Vitalik Buterin (@vbuterin), Sam Wilson <sam@example.com>')).toEqual([
      'Vitalik Buterin',
      'Sam Wilson',
    ]);
  });

  it('returns nothing for a missing or empty byline', () => {
    expect(parseAuthors(undefined)).toEqual([]);
    expect(parseAuthors('  ,  ')).toEqual([]);
  });
});

describe('eipArticle', () => {
  const base = { id: 7702, prefix: 'EIP', title: 'Set Code for EOAs', description: 'Lets EOAs act as contracts.' };

  it('builds a headline and canonical url from the id', () => {
    const article = eipArticle(base) as Record<string, unknown>;
    expect(article.headline).toBe('EIP-7702: Set Code for EOAs');
    expect(article.url).toBe('https://forkcast.org/eips/7702/');
  });

  it('omits author and dateModified when there is nothing to say', () => {
    const article = eipArticle(base);
    expect(article).not.toHaveProperty('author');
    expect(article).not.toHaveProperty('dateModified');
  });

  it('carries a stage-change date as dateModified', () => {
    const article = eipArticle({ ...base, dateModified: '2025-03-06' }) as Record<string, unknown>;
    expect(article.dateModified).toBe('2025-03-06');
  });
});

describe('youtubeId', () => {
  it.each([
    ['https://youtube.com/watch?v=CTfwQ4kOhE4', 'CTfwQ4kOhE4'],
    ['https://www.youtube.com/watch?v=CTfwQ4kOhE4&t=30s', 'CTfwQ4kOhE4'],
    ['https://youtu.be/CTfwQ4kOhE4', 'CTfwQ4kOhE4'],
    ['https://www.youtube.com/live/CTfwQ4kOhE4', 'CTfwQ4kOhE4'],
    ['https://www.youtube.com/embed/CTfwQ4kOhE4', 'CTfwQ4kOhE4'],
  ])('extracts the id from %s', (url, expected) => {
    expect(youtubeId(url)).toBe(expected);
  });

  it('returns undefined for a missing or non-YouTube url', () => {
    expect(youtubeId(undefined)).toBeUndefined();
    expect(youtubeId('https://example.com/some-video')).toBeUndefined();
  });
});

describe('callVideo', () => {
  const base = {
    name: 'AllCoreDevs - Consensus #165',
    description: 'Watch AllCoreDevs - Consensus call #165 from 2025-09-18.',
    date: '2025-09-18',
    path: 'acdc/165',
  };

  it('derives thumbnail and embed urls from the video id', () => {
    const video = callVideo({ ...base, videoUrl: 'https://youtube.com/watch?v=CTfwQ4kOhE4' }) as Record<
      string,
      unknown
    >;
    expect(video.thumbnailUrl).toBe('https://i.ytimg.com/vi/CTfwQ4kOhE4/hqdefault.jpg');
    expect(video.embedUrl).toBe('https://www.youtube.com/embed/CTfwQ4kOhE4');
    expect(video.url).toBe('https://forkcast.org/calls/acdc/165/');
  });

  it('claims no video when the call has none', () => {
    expect(callVideo(base)).toBeUndefined();
    expect(callVideo({ ...base, videoUrl: 'https://example.com/nope' })).toBeUndefined();
  });
});

describe('serializeJsonLd', () => {
  it('escapes < so a title cannot break out of the script element', () => {
    const json = serializeJsonLd([{ name: '</script><img onerror=alert(1)>' }])!;
    expect(json).not.toContain('</script>');
    expect(json).toContain('\\u003c');
  });

  it('emits a bare object for one graph and an array for several', () => {
    expect(serializeJsonLd([{ a: 1 }])).toBe('{"a":1}');
    expect(serializeJsonLd([{ a: 1 }, { b: 2 }])).toBe('[{"a":1},{"b":2}]');
  });

  it('drops absent graphs, and returns undefined when none remain', () => {
    expect(serializeJsonLd([undefined, { a: 1 }])).toBe('{"a":1}');
    expect(serializeJsonLd([undefined, undefined])).toBeUndefined();
  });

  it('produces parseable JSON for the real site graph', () => {
    expect(() => JSON.parse(serializeJsonLd([siteGraph()])!)).not.toThrow();
  });
});
