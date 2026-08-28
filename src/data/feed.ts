/**
 * Hand-edited configuration for /feed.xml. Automated syncs never write to this
 * file, so nothing becomes a feed item without a human commit here.
 */
export interface FeedConfig {
  /**
   * EIP inclusion-stage changes, from the same data as
   * /api/eip-stage-changes.json. Publishes the whole chronology.
   */
  eipStageChanges: { enabled: boolean };
  /**
   * Mainnet, testnet, and devnet activations from `timelineEvents`
   * (src/data/events.ts). The `milestone` and `announcement` events in that
   * list are not published.
   */
  networkActivations: { enabled: boolean };
  /**
   * One item per published protocol call: its name, date, and page link only.
   * None of the call's synced summary or decision text enters the feed, so
   * the post-publish QA round never has anything here to retract.
   */
  callsPublished: { enabled: boolean };
}

export const feedConfig: FeedConfig = {
  eipStageChanges: { enabled: true },
  networkActivations: { enabled: true },
  callsPublished: { enabled: true },
};
