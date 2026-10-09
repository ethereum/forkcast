import { describe, expect, it } from 'vitest';
import { remarkHardBreaks } from './remarkHardBreaks';

const transform = remarkHardBreaks();

describe('remarkHardBreaks', () => {
  it('breaks a paragraph wherever its text carries a newline', () => {
    // How an agenda of en-dash items parses: one paragraph, one text node.
    const tree = {
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: '– Clients updates\n– DC simulations' }] },
      ],
    };

    expect(transform(tree).children![0].children).toEqual([
      { type: 'text', value: '– Clients updates' },
      { type: 'break' },
      { type: 'text', value: '– DC simulations' },
    ]);
  });

  it('breaks around inline nodes without disturbing them', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Updates\n' },
            { type: 'link', url: 'https://example.com', children: [{ type: 'text', value: 'agenda' }] },
          ],
        },
      ],
    };

    expect(transform(tree).children![0].children).toEqual([
      { type: 'text', value: 'Updates' },
      { type: 'break' },
      { type: 'text', value: '' },
      { type: 'link', url: 'https://example.com', children: [{ type: 'text', value: 'agenda' }] },
    ]);
  });

  it('leaves code untouched, since only text nodes are split', () => {
    const code = { type: 'code', value: 'line one\nline two' };
    const tree = { type: 'root', children: [code] };

    expect(transform(tree).children![0]).toEqual(code);
  });

  it('leaves a paragraph with no newline alone', () => {
    const tree = {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'One item' }] }],
    };

    expect(transform(tree).children![0].children).toEqual([{ type: 'text', value: 'One item' }]);
  });
});
