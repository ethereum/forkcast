import { describe, it, expect } from 'vitest';
import React from 'react';
import { parseMarkdownCode, parseMarkdownLinks } from './markdown';

/** Flattens the parsed nodes to the shape each one renders as, for readable assertions. */
const shape = (nodes: React.ReactNode[]) =>
  nodes.map((node) => {
    if (typeof node === 'string') return node;
    const element = node as React.ReactElement<{ children?: React.ReactNode; href?: string }>;
    const tag = element.type as string;
    return tag === 'a'
      ? { a: element.props.children, href: element.props.href }
      : { [tag]: element.props.children };
  });

describe('parseMarkdownCode', () => {
  it('turns backtick spans into code elements and leaves the rest alone', () => {
    expect(shape(parseMarkdownCode(['set `max_fee` first']))).toEqual([
      'set ',
      { code: 'max_fee' },
      ' first',
    ]);
  });

  it('handles several spans, and a string with none', () => {
    expect(shape(parseMarkdownCode(['`a` and `b`']))).toEqual([
      { code: 'a' },
      ' and ',
      { code: 'b' },
    ]);
    expect(shape(parseMarkdownCode(['nothing to mark']))).toEqual(['nothing to mark']);
  });

  it('leaves an unclosed backtick as written rather than swallowing the rest', () => {
    expect(shape(parseMarkdownCode(['a `b and more']))).toEqual(['a `b and more']);
  });

  it('passes non-string nodes through untouched, so it composes after links', () => {
    const nodes = parseMarkdownCode(parseMarkdownLinks('see [PR-1](https://example.com/1)'));
    expect(shape(nodes)).toEqual(['see ', { a: 'PR-1', href: 'https://example.com/1' }]);
  });
});

describe('a devnet spec EIP title', () => {
  it('renders its code spans and its pull request links together', () => {
    // The shape ethPandaOps now writes these in, e.g. bogota-devnet-2's EIP-7906 row.
    const title =
      '`TXDIFF` removed ([PR-12530](https://github.com/ethereum/EIPs/pull/12530))';
    expect(shape(parseMarkdownCode(parseMarkdownLinks(title)))).toEqual([
      { code: 'TXDIFF' },
      ' removed (',
      { a: 'PR-12530', href: 'https://github.com/ethereum/EIPs/pull/12530' },
      ')',
    ]);
  });
});
