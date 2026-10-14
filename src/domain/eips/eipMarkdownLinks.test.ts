import { describe, expect, it } from 'vitest';
import { resolveEipMarkdownLink, resolveEipOverviewLink } from './eipMarkdownLinks';

describe('resolveEipMarkdownLink', () => {
  it('links tracked emitted EIPs internally', () => {
    const eipsById = new Map([[7702, {}]]);

    expect(resolveEipMarkdownLink('./eip-7702.md', eipsById)).toEqual({
      kind: 'internal',
      eipId: 7702,
      href: '/eips/7702',
    });
  });

  it('links untracked EIP references to the canonical spec URL', () => {
    const eipsById = new Map([[7702, {}]]);

    for (const href of ['./eip-4337.md', 'EIPS/eip-4337.md']) {
      expect(resolveEipMarkdownLink(href, eipsById)).toEqual({
        kind: 'external',
        eipId: 4337,
        href: 'https://eips.ethereum.org/EIPS/eip-4337',
      });
    }
  });

  it('links tracked pending EIPs internally because Forkcast emits their pages', () => {
    const eipsById = new Map([
      [8208, { id: 8208, pendingPullRequest: { number: 123, url: 'https://github.com/ethereum/EIPs/pull/123' } }],
    ]);

    expect(resolveEipMarkdownLink('../EIPS/eip-8208.md', eipsById)).toEqual({
      kind: 'internal',
      eipId: 8208,
      href: '/eips/8208',
    });
  });

  it('ignores non-EIP links', () => {
    expect(resolveEipMarkdownLink('https://example.com', new Map())).toBeNull();
  });
});

describe('resolveEipOverviewLink', () => {
  const eipsById = new Map<number, unknown>([[8141, {}], [7907, {}]]);

  it('resolves spec-site pages for EIPs Forkcast carries', () => {
    for (const href of [
      'https://eips.ethereum.org/EIPS/eip-8141',
      'https://eips.ethereum.org/EIPS/eip-8141/',
      'https://eips.ethereum.org/EIPS/eip-8141.md',
    ]) {
      expect(resolveEipOverviewLink(href, eipsById)).toBe(8141);
    }
  });

  it('resolves Forkcast EIP pages, absolute or relative', () => {
    expect(resolveEipOverviewLink('https://forkcast.org/eips/7907/', eipsById)).toBe(7907);
    expect(resolveEipOverviewLink('/eips/7907/', eipsById)).toBe(7907);
    expect(resolveEipOverviewLink('/eips/7907', eipsById)).toBe(7907);
  });

  it('leaves links that pick a particular view alone', () => {
    // The author chose that tab; the drawer has no way to honour it.
    expect(resolveEipOverviewLink('https://forkcast.org/eips/8141/?tab=history', eipsById)).toBeNull();
    expect(resolveEipOverviewLink('https://eips.ethereum.org/EIPS/eip-8141#specification', eipsById)).toBeNull();
  });

  it('leaves non-EIP links alone, however they are labelled', () => {
    for (const href of [
      'https://github.com/ethereum/EIPs/pull/12048',
      'https://ethresear.ch/t/torrents-and-eip-4444/19788',
      'https://forkcast.org/calls/acdt/095/',
      'https://forkcast.org/eips/?upgrade=Hegota',
      'not a url at all',
    ]) {
      expect(resolveEipOverviewLink(href, eipsById)).toBeNull();
    }
  });

  it('leaves EIPs Forkcast carries no data for alone — nothing to show in place', () => {
    expect(resolveEipOverviewLink('https://eips.ethereum.org/EIPS/eip-4337', eipsById)).toBeNull();
  });
});
