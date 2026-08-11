/**
 * Loads `public/search-light.json` — call summaries only (tldr + notes +
 * key_decisions), ~185 KB gzipped. Small enough to fetch on the first global
 * search open from any page, unlike the ~6 MB transcript corpus.
 *
 * ~4k entries means a plain substring scan is sub-millisecond, so this tier
 * deliberately has no inverted index and no IndexedDB — just a flat array with a
 * precomputed lowercase form.
 */
import type { LightEntry, LightEntryKind } from './types';

interface RawEntry {
  kind: LightEntryKind;
  timestamp: string;
  text: string;
  category?: string;
  owner?: string;
  heading?: string;
}

interface RawCall {
  type: string;
  date: string;
  number: string;
  path: string;
  meeting?: string;
  breakout?: string;
  entries: RawEntry[];
}

let pending: Promise<LightEntry[]> | null = null;

function flatten(corpus: { calls?: RawCall[] }): LightEntry[] {
  return (corpus.calls ?? []).flatMap((call) =>
    call.entries.map((entry) => ({
      ...entry,
      callType: call.type,
      callDate: call.date,
      callNumber: call.number,
      callPath: call.path,
      meeting: call.meeting,
      breakout: call.breakout,
      normalized: entry.text.toLowerCase(),
    })),
  );
}

/** Memoized; concurrent callers share one fetch. Failures reset so a retry can succeed. */
export function loadLightCorpus(): Promise<LightEntry[]> {
  if (!pending) {
    // GitHub Pages serves this at a stable filename with no content hash, so
    // revalidate by ETag rather than trusting the HTTP cache.
    pending = fetch('/search-light.json', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to fetch search-light.json: ${response.status}`);
        return response.json();
      })
      .then(flatten)
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
