/**
 * Shared shapes for global search. Type-only by design: this module must stay
 * runtime-empty so the tiny always-mounted island can import from it without
 * pulling anything else into the page bundle.
 */
import type { EIP } from '../../types/eip';
import type { Call } from '../../data/calls';

/** A result group. Rendered as its own labelled section in the modal. */
export type SectionId =
  | 'eips'
  | 'calls'
  | 'summaries'
  | 'upgrades'
  | 'networks'
  | 'pages'
  | 'transcripts';

/** The scope chips above the results. `all` shows every section, capped. */
export type SearchScope = 'all' | 'eips' | 'calls' | 'transcripts' | 'site';

interface GlobalResultBase {
  /** Ordering score within the section. Only comparable to peers in the same section. */
  score: number;
  /**
   * 0–100 confidence that this result *is* the thing the query names (an EIP
   * number, a call's type + number, a devnet id). Drives cross-section promotion;
   * raw `score` scales are not comparable across sections.
   */
  identity: number;
  href: string;
}

export interface EipResult extends GlobalResultBase {
  kind: 'eip';
  eip: EIP;
  matchedFields: string[];
}

export interface CallEntityResult extends GlobalResultBase {
  kind: 'call';
  call: Call;
  /** e.g. "ACDE #242" */
  label: string;
  /** e.g. "AllCoreDevs - Execution" */
  seriesName: string;
}

export type LightEntryKind = 'highlight' | 'decision' | 'action' | 'target' | 'note';

/** A light-corpus entry joined with the call it came from, ready to render. */
export interface LightEntry {
  kind: LightEntryKind;
  timestamp: string;
  text: string;
  category?: string;
  owner?: string;
  heading?: string;
  callType: string;
  callDate: string;
  callNumber: string;
  callPath: string;
  meeting?: string;
  breakout?: string;
  /** Precomputed lowercase `text` — the whole tier is scanned per keystroke. */
  normalized: string;
}

export interface SummaryResult extends GlobalResultBase {
  kind: 'summary';
  entry: LightEntry;
}

export interface TranscriptResult extends GlobalResultBase {
  kind: 'transcript';
  callType: string;
  callDate: string;
  callNumber: string;
  contentType: 'transcript' | 'chat';
  timestamp: string;
  speaker?: string;
  text: string;
}

export interface SiteEntity {
  id: string;
  group: Extract<SectionId, 'upgrades' | 'networks' | 'pages'>;
  title: string;
  description: string;
  href: string;
  keywords: string[];
}

export interface SiteResult extends GlobalResultBase {
  kind: 'site';
  entity: SiteEntity;
}

export type GlobalResult =
  | EipResult
  | CallEntityResult
  | SummaryResult
  | TranscriptResult
  | SiteResult;

export interface SectionResults {
  id: SectionId;
  /** Results to render — already capped in `all` scope. */
  results: GlobalResult[];
  /** Result count before capping, so the "Show all N" row can name the real number. */
  total: number;
}

export type RowAction =
  | { kind: 'expand-section'; sectionId: SectionId; scope: SearchScope; label: string }
  | { kind: 'activate-transcripts'; label: string };

export type FlatRow =
  | { type: 'header'; sectionId: SectionId; label: string; total: number }
  | { type: 'result'; sectionId: SectionId; result: GlobalResult }
  | { type: 'action'; action: RowAction };
