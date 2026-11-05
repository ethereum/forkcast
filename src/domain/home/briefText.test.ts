import { describe, expect, it } from 'vitest';
import { parseBriefText } from './briefText';

describe('parseBriefText', () => {
  it('returns prose with no links as one segment', () => {
    expect(parseBriefText('Nothing to link here.')).toEqual([{ text: 'Nothing to link here.' }]);
  });

  it('keeps a site path on the site, and sends an http URL off it', () => {
    expect(parseBriefText('See [EIP-7594](/eips/7594) and [devcon](https://devcon.org).')).toEqual([
      { text: 'See ' },
      { text: 'EIP-7594', href: '/eips/7594', external: false },
      { text: ' and ' },
      { text: 'devcon', href: 'https://devcon.org', external: true },
      { text: '.' },
    ]);
  });

  it('never hands back an href for a URL we do not render', () => {
    for (const url of ['javascript:alert(1)', '//evil.example', 'mailto:a@b.c', 'eips/7594']) {
      const segments = parseBriefText(`go [here](${url})`);
      expect(segments.some((segment) => segment.href), url).toBe(false);
      expect(segments.map((segment) => segment.text).join(''), url).toContain('here');
    }
  });

  it('leaves a rejected link as plain words', () => {
    expect(parseBriefText('go [here](mailto:a@b.c)')).toEqual([{ text: 'go ' }, { text: 'here' }]);
  });

  it('handles a link that opens and closes the string', () => {
    expect(parseBriefText('[all of it](/eips)')).toEqual([
      { text: 'all of it', href: '/eips', external: false },
    ]);
  });

  it('is not left mid-string by the previous call', () => {
    const once = parseBriefText('a [x](/a) b [y](/b) c');
    expect(parseBriefText('a [x](/a) b [y](/b) c')).toEqual(once);
    expect(once.filter((segment) => segment.href)).toHaveLength(2);
  });

  it('returns nothing for empty prose', () => {
    expect(parseBriefText('')).toEqual([]);
  });
});
