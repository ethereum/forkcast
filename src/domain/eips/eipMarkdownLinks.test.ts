import { describe, expect, it } from 'vitest';
import { resolveEipMarkdownLink } from './eipMarkdownLinks';

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

  it('links pending EIPs to the canonical spec URL because no emitted page exists', () => {
    const eipsById = new Map([
      [8208, { pendingPullRequest: { number: 123, url: 'https://github.com/ethereum/EIPs/pull/123' } }],
    ]);

    expect(resolveEipMarkdownLink('../EIPS/eip-8208.md', eipsById)).toEqual({
      kind: 'external',
      eipId: 8208,
      href: 'https://eips.ethereum.org/EIPS/eip-8208',
    });
  });

  it('ignores non-EIP links', () => {
    expect(resolveEipMarkdownLink('https://example.com', new Map())).toBeNull();
  });
});
