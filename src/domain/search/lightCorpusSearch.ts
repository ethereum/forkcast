/**
 * Substring search over the light corpus, plus the deep links that land a result
 * on the right surface of the call page.
 */
import type { LightEntry, LightEntryKind, SummaryResult } from './types';

export interface SummaryFilters {
  /** Lowercase call type slug, or 'all'. */
  callType: string;
  kind: 'all' | LightEntryKind;
}

export const EMPTY_SUMMARY_FILTERS: SummaryFilters = { callType: 'all', kind: 'all' };

/** tldr/notes entries land on different surfaces of the call page. */
const KIND_BONUS: Record<LightEntryKind, number> = {
  decision: 3,
  action: 2,
  note: 1,
  highlight: 0,
  target: 0,
};

export function searchLightCorpus(
  query: string,
  entries: LightEntry[],
  filters: SummaryFilters,
): SummaryResult[] {
  const normalized = query.toLowerCase().trim();
  const terms = normalized.split(/\s+/).filter((term) => term.length > 0);
  if (terms.length === 0) return [];

  const results: SummaryResult[] = [];

  for (const entry of entries) {
    if (filters.callType !== 'all' && entry.callType !== filters.callType) continue;
    if (filters.kind !== 'all' && entry.kind !== filters.kind) continue;

    const matched = terms.filter((term) => entry.normalized.includes(term)).length;
    if (matched === 0) continue;

    let score = matched * 2;
    if (matched === terms.length) score += 5;
    if (terms.length > 1 && entry.normalized.includes(normalized)) score += 10;
    score += KIND_BONUS[entry.kind];

    results.push({ kind: 'summary', entry, score, identity: 0, href: buildSummaryHref(entry, query) });
  }

  // Summary text carries no identity signal, so ties fall back to recency.
  results.sort((a, b) => b.score - a.score || b.entry.callDate.localeCompare(a.entry.callDate));
  return results;
}

/**
 * Deep links must match what CallPage already consumes:
 *  - notes land on the notes tab (`?summary=notes`)
 *  - tldr entries need all four of search/timestamp/type/text for the page's
 *    `hasSearchResult` check, which also auto-expands the summary card
 *  - breakout entries carry the tab through so the CL/EL view is selected
 */
export function buildSummaryHref(entry: LightEntry, query: string): string {
  const breakout = entry.breakout ? `&breakout=${encodeURIComponent(entry.breakout)}` : '';

  if (entry.kind === 'note') {
    return `/calls/${entry.callPath}?summary=notes&timestamp=${encodeURIComponent(entry.timestamp)}${breakout}`;
  }

  const type = entry.kind === 'action' ? 'action' : 'agenda';
  return (
    `/calls/${entry.callPath}?search=${encodeURIComponent(query)}` +
    `&timestamp=${encodeURIComponent(entry.timestamp)}` +
    `&type=${type}` +
    `&text=${encodeURIComponent(entry.text)}${breakout}`
  );
}
