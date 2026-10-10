// Shapes of the per-call JSON artifacts in public/artifacts/{type}/{date}_{number}/.

/** `sync` in config.json: where the same moment falls in the transcript and in the video. */
export interface SyncConfig {
  transcriptStartTime: string | null;
  videoStartTime: string | null;
}

/** A breakout bundled into its parent call's config.json (PM pipeline, ACDT 087+). */
export interface BreakoutConfig {
  videoUrl: string;
  sync?: SyncConfig;
}

/** config.json */
export interface CallConfig {
  videoUrl?: string;
  issue?: number;
  sync?: SyncConfig;
  breakouts?: Record<string, BreakoutConfig>;
}

export interface TldrHighlight {
  timestamp: string;
  highlight: string;
}

export interface TldrActionItem {
  timestamp: string;
  action: string;
  owner: string;
}

export interface TldrDecision {
  timestamp: string;
  decision: string;
}

export interface TldrTarget {
  timestamp: string;
  /** A few older summaries put this under `commitment` instead. */
  target?: string;
  commitment?: string;
}

/** tldr.json (tldr_{kind}.json for bundled breakouts) */
export interface TldrData {
  meeting: string;
  highlights: { [category: string]: TldrHighlight[] };
  action_items: TldrActionItem[];
  decisions?: TldrDecision[];
  targets?: TldrTarget[];
}
