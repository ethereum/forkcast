import {
  getAdjustedVideoTime,
  timestampToSeconds,
  type SyncConfig,
} from './timestamp';

// Tuning for skipping the silent gaps between transcript messages, in video
// seconds.
export const GAP_SKIP_THRESHOLD_SECONDS = 2; // gap must be longer than this to skip
export const GAP_SKIP_WAIT_SECONDS = 0.5; // let the video play this far into a gap before skipping
export const GAP_SKIP_MIN_REMAINING_SECONDS = 1; // play out naturally once the next message is this close
export const GAP_SKIP_LAND_LEAD_SECONDS = 0.3; // seek this far before the next message (YouTube lands late, not early)

export interface GapSkipInterval {
  /** Gap start in video seconds: the previous message's end. */
  start: number;
  /** Seek target in video seconds: the next message's start, led. */
  target: number;
}

/**
 * Video-time intervals over the gaps longer than GAP_SKIP_THRESHOLD_SECONDS
 * between consecutive transcript messages. Entries without a known end time
 * are skipped; the result is sorted by `start`.
 */
export function computeGapSkipIntervals(
  entries: Array<{ timestamp: string; endTimestamp?: string }>,
  sync?: SyncConfig,
): GapSkipInterval[] {
  const intervals: GapSkipInterval[] = [];
  for (let i = 0; i < entries.length - 1; i++) {
    const endTimestamp = entries[i].endTimestamp;
    if (!endTimestamp) continue;
    const gapSeconds =
      timestampToSeconds(entries[i + 1].timestamp) -
      timestampToSeconds(endTimestamp);
    if (gapSeconds <= GAP_SKIP_THRESHOLD_SECONDS) continue;
    intervals.push({
      start: getAdjustedVideoTime(endTimestamp, sync),
      target: Math.max(
        0,
        getAdjustedVideoTime(entries[i + 1].timestamp, sync) -
          GAP_SKIP_LAND_LEAD_SECONDS,
      ),
    });
  }
  return intervals;
}

/**
 * The seek target (the next message's start, led) while the video is playing
 * through a long gap, otherwise null. Respects GAP_SKIP_WAIT_SECONDS (no
 * skipping in the first moments of a gap) and GAP_SKIP_MIN_REMAINING_SECONDS.
 * `intervals` must be sorted by `start`.
 */
export function findGapSkipTarget(
  videoTime: number,
  intervals: GapSkipInterval[],
): number | null {
  for (const interval of intervals) {
    if (videoTime < interval.start + GAP_SKIP_WAIT_SECONDS) break;
    if (videoTime >= interval.target) continue;
    if (interval.target - videoTime >= GAP_SKIP_MIN_REMAINING_SECONDS) {
      return interval.target;
    }
  }
  return null;
}

