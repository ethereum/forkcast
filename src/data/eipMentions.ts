import type { SyncConfig } from '../utils/timestamp';
import indexRaw from './eip-mentions-index.json';

/** A call recording that mentioned an EIP — the main call, or one bundled breakout. */
export interface MentionCall {
  /** Route path, e.g. "acde/236" — this is literally the `/calls/{path}` param. */
  path: string;
  type: string;
  number: string;
  date: string;
  /** One-offs carry a hand-written name that already reads as a full title. */
  name?: string;
  /** Bundled breakout kind, e.g. "cl". Absent for the main recording. */
  breakout?: string;
  /** This recording's own offset; a breakout's differs from its parent's. */
  sync: SyncConfig | null;
}

interface EipMentionsIndex {
  version: number;
  calls: Record<string, MentionCall>;
  eips: Record<string, string[]>;
}

const index = indexRaw as unknown as EipMentionsIndex;

/** Stable identity for a recording, since a breakout shares its parent's path. */
export const mentionCallKey = (call: MentionCall): string =>
  call.breakout ? `${call.path}:${call.breakout}` : call.path;

/** The call's `eip_mentions.json`, under `public/artifacts/`. */
export const mentionArtifactUrl = (call: MentionCall): string =>
  `/artifacts/${call.type}/${call.date}_${call.number}/eip_mentions${call.breakout ? `_${call.breakout}` : ''}.json`;

/**
 * Calls that mentioned this EIP, newest first.
 *
 * Synchronous on purpose: the EIP tab bar decides every conditional tab from
 * bundled data, so the Mentions tab and its count must be known before paint.
 * Only the mention bodies are fetched, by `useEipMentions`.
 */
export const mentionCallsForEip = (eipId: number): MentionCall[] =>
  (index.eips[String(eipId)] ?? []).map((key) => index.calls[key]).filter(Boolean);
