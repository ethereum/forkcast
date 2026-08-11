/**
 * The transcript/chat tier: ~6 MB gzipped, expanded client-side into an inverted
 * index in IndexedDB. Strictly opt-in — the user has to activate it once, after
 * which it stays on for the session (sessionStorage, so it survives the full page
 * loads Astro does between routes).
 */
import type { TranscriptResult } from './types';

const ACTIVATION_KEY = 'forkcast:search-transcripts';

export interface TranscriptFilters {
  /** Uppercase call type ('ACDE') or 'all'. */
  callType: string;
  contentType: 'all' | 'transcript' | 'chat';
}

export const EMPTY_TRANSCRIPT_FILTERS: TranscriptFilters = { callType: 'all', contentType: 'all' };

export function isHeavyTierActivated(): boolean {
  try {
    return sessionStorage.getItem(ACTIVATION_KEY) === '1';
  } catch {
    return false;
  }
}

export function activateHeavyTier(): void {
  try {
    sessionStorage.setItem(ACTIVATION_KEY, '1');
  } catch {
    // Private mode etc. — the tier still works, it just won't survive navigation.
  }
}

export async function searchHeavyTier(
  query: string,
  filters: TranscriptFilters,
): Promise<TranscriptResult[]> {
  if (query.trim().length < 2) return [];

  // Dynamic so the ~20 KB index service and its corpus plumbing stay out of the
  // modal chunk for everyone who never opts in.
  const { searchIndexService } = await import('../../services/searchIndex');

  // The index also holds the agenda/action docs that the light tier already
  // renders as "Call summaries". Naming both types keeps them out of the result
  // budget instead of filtering them off the end of it.
  const contentTypes: Array<'transcript' | 'chat'> =
    filters.contentType === 'all' ? ['transcript', 'chat'] : [filters.contentType];

  const docs = await searchIndexService.search(query, {
    callType: filters.callType === 'all' ? undefined : (filters.callType as 'ACDC' | 'ACDE' | 'ACDT'),
    contentTypes,
    limit: 200,
  });

  return docs.map((doc) => ({
    kind: 'transcript' as const,
    callType: doc.callType,
    callDate: doc.callDate,
    callNumber: doc.callNumber,
    contentType: doc.type as 'transcript' | 'chat',
    timestamp: doc.timestamp,
    speaker: doc.speaker,
    text: doc.text,
    score: 0,
    identity: 0,
    href:
      `/calls/${doc.callType}/${doc.callNumber}?search=${encodeURIComponent(query)}` +
      `&timestamp=${encodeURIComponent(doc.timestamp)}` +
      `&type=${doc.type}` +
      `&text=${encodeURIComponent(doc.text)}`,
  }));
}
