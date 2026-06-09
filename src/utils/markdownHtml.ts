/**
 * Build-time HTML-string counterparts of the React `parseMarkdownLinks` /
 * `parseMarkdownBold` helpers (utils/markdown.tsx), for rendering inline markdown
 * on static `.astro` surfaces via `set:html`. Text is HTML-escaped to match React's
 * escaping; only `[text](url)` (http/https) and `**bold**` are interpreted.
 */
const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const isSafeUrl = (url: string): boolean => /^https?:\/\//i.test(url);

/** `**bold**` → `<strong>`, escaping all text. Matches `parseMarkdownBold`. */
const boldToHtml = (text: string): string => {
  const boldRegex = /\*\*(.+?)\*\*/g;
  let out = '';
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > last) out += escapeHtml(text.slice(last, match.index));
    out += `<strong>${escapeHtml(match[1])}</strong>`;
    last = match.index + match[0].length;
  }
  if (last < text.length) out += escapeHtml(text.slice(last));
  return out;
};

/**
 * Inline markdown → HTML string. `[text](url)` becomes an anchor (matching the React
 * link styling); with `bold: true`, `**x**` in the non-link text becomes `<strong>`
 * (bold is not applied inside link text, mirroring `parseMarkdownBold(parseMarkdownLinks(...))`).
 */
export const inlineMarkdownToHtml = (text: string, { bold = false } = {}): string => {
  if (!text) return '';
  const renderText = (t: string) => (bold ? boldToHtml(t) : escapeHtml(t));
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let out = '';
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(text)) !== null) {
    const [full, linkText, url] = match;
    if (match.index > last) out += renderText(text.slice(last, match.index));
    if (isSafeUrl(url)) {
      out += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="underline decoration-1 underline-offset-2 transition-colors hover:opacity-70">${escapeHtml(linkText)}</a>`;
    } else {
      out += escapeHtml(linkText);
    }
    last = match.index + full.length;
  }
  if (last < text.length) out += renderText(text.slice(last));
  return out;
};
