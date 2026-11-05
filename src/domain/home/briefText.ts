/** A chunk of a brief's prose: plain text, or text that links somewhere. */
export interface BriefSegment {
  text: string;
  /** Absent on plain prose. */
  href?: string;
  /** Whether the link leaves the site, and so should open in a new tab. */
  external?: boolean;
}

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Whether a link in a brief is one the page will render.
 *
 * Only two shapes qualify: a site-relative path, and an http(s) URL. A protocol-relative
 * `//host` is rejected even though it starts with a slash, since it reads as a path but
 * leaves the site.
 */
function classify(url: string): { external: boolean } | null {
  if (/^https?:\/\//i.test(url)) return { external: true };
  if (url.startsWith('/') && !url.startsWith('//')) return { external: false };
  return null;
}

/**
 * Split a brief's prose into text and links.
 *
 * A link the page won't render keeps its text and loses its href, so a mistyped URL — or a
 * scheme like `javascript:` — degrades to prose rather than to something clickable.
 *
 * A URL is read up to its first `)`, as markdown's own shorthand is: one containing a
 * bracket ends early and is rejected, leaving the remainder as prose. No URL worth putting
 * in a brief needs one.
 */
export function parseBriefText(text: string): BriefSegment[] {
  const segments: BriefSegment[] = [];
  let last = 0;

  LINK.lastIndex = 0;
  for (let match = LINK.exec(text); match !== null; match = LINK.exec(text)) {
    const [whole, label, url] = match;
    if (match.index > last) segments.push({ text: text.slice(last, match.index) });

    const kind = classify(url.trim());
    segments.push(kind ? { text: label, href: url.trim(), external: kind.external } : { text: label });
    last = match.index + whole.length;
  }

  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}
