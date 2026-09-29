/**
 * The pages the reader last opened from global search, kept in localStorage so
 * the modal can offer them back before anything is typed.
 *
 * Only the route is stored, never the query string a summary or transcript hit
 * carries — the launcher resolves rows by route, and one page is one entry
 * however the reader found it. Every row is re-resolved against live data when
 * the modal opens, so titles and stages stay current and a link to something
 * that no longer exists drops out of the list on its own.
 */
const STORAGE_KEY = 'search-recent-hrefs';

/** Kept deeper than the launcher shows, so a scoped view still has rows to draw on. */
const KEEP = 12;

const toRoute = (href: string) => href.replace(/[?#].*$/, '');

/** Most recent first, one entry per route. */
const routes = (hrefs: string[]) => [...new Set(hrefs.map(toRoute))].slice(0, KEEP);

/** Most recent first. Re-opening something moves it back to the front. */
export function withRecent(hrefs: string[], href: string): string[] {
  return routes([href, ...hrefs]);
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

export function readRecentHrefs(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return isStringArray(parsed) ? routes(parsed) : [];
  } catch {
    // Unreadable or malformed storage (private mode, a hand-edited value) just
    // means no history — never a reason to keep the modal from opening.
    return [];
  }
}

export function recordRecentHref(href: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withRecent(readRecentHrefs(), href)));
  } catch {
    // Storage full or blocked; the list simply doesn't grow.
  }
}
