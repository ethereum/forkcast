import { describe, it, expect } from 'vitest';
import { inlineMarkdownToHtml } from './markdownHtml';

describe('inlineMarkdownToHtml', () => {
  it('escapes plain text', () => {
    expect(inlineMarkdownToHtml('a < b & "c"')).toBe('a &lt; b &amp; &quot;c&quot;');
  });

  it('renders http(s) markdown links as anchors with escaped url + text', () => {
    expect(inlineMarkdownToHtml('see [the docs](https://x.io?a=1&b=2)')).toBe(
      'see <a href="https://x.io?a=1&amp;b=2" target="_blank" rel="noopener noreferrer" class="underline decoration-1 underline-offset-2 transition-colors hover:opacity-70">the docs</a>',
    );
  });

  it('renders unsafe-scheme links as escaped plain text', () => {
    expect(inlineMarkdownToHtml('[click](mailto:x@y.io)')).toBe('click');
  });

  it('applies bold to non-link text only when enabled', () => {
    expect(inlineMarkdownToHtml('a **bold** word', { bold: true })).toBe(
      'a <strong>bold</strong> word',
    );
    expect(inlineMarkdownToHtml('a **bold** word')).toBe('a **bold** word');
  });

  it('does not bold inside link text', () => {
    expect(inlineMarkdownToHtml('[**x**](https://x.io)', { bold: true })).toBe(
      '<a href="https://x.io" target="_blank" rel="noopener noreferrer" class="underline decoration-1 underline-offset-2 transition-colors hover:opacity-70">**x**</a>',
    );
  });

  it('returns empty string for empty input', () => {
    expect(inlineMarkdownToHtml('')).toBe('');
  });
});
