import type { NetworkUpgrade } from './upgrades';

/**
 * Hand-edited configuration for /feed.xml. Automated syncs never write to this
 * file, so nothing becomes a feed item without a human commit here.
 */

export interface UpgradeStatusFeedEntry {
  /** `id` of an entry in `networkUpgrades` (src/data/upgrades.ts). */
  upgradeId: string;
  /** The status the upgrade moved to. */
  status: NetworkUpgrade['status'];
  /** YYYY-MM-DD of the change. Part of the item GUID, so never edit it after publishing. */
  date: string;
}

export interface FeedConfig {
  /** EIP inclusion-stage changes, from the same data as /api/eip-stage-changes.json. */
  eipStageChanges: { enabled: boolean; count: number };
  /**
   * Call tl;dr summaries. Summaries sync in from ACDbot without a
   * Forkcast-side review step, so a call only becomes a feed item once a
   * human adds its `{type}/{number}` path to reviewedCalls.
   */
  callSummaries: { enabled: boolean; reviewedCalls: string[] };
  /**
   * Individual decisions from a call's key_decisions.json, one feed item per
   * decision. Gated by the same per-call review as summaries: only calls
   * listed in callSummaries.reviewedCalls emit decisions.
   */
  callDecisions: { enabled: boolean };
  /**
   * Upgrade status changes. upgrades.ts stores only the current status, so
   * each change is recorded here by hand when it happens.
   */
  upgradeStatusChanges: { enabled: boolean; entries: UpgradeStatusFeedEntry[] };
}

export const feedConfig: FeedConfig = {
  eipStageChanges: { enabled: true, count: 20 },
  callSummaries: { enabled: false, reviewedCalls: [] },
  callDecisions: { enabled: false },
  upgradeStatusChanges: { enabled: false, entries: [] },
};
