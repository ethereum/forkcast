import { describe, expect, it } from "vitest";
import {
  GAP_SKIP_LAND_LEAD_SECONDS,
  GAP_SKIP_WAIT_SECONDS,
  computeGapSkipIntervals,
  findGapSkipTarget,
} from "./gapSkip";

// Gap 1 runs video 10–14 (next message at 14.3); gap 2 runs 20–35.
const INTERVALS = [
  { start: 10, target: 14 },
  { start: 20, target: 35 },
];

describe("computeGapSkipIntervals", () => {
  it("includes gaps longer than the threshold, with the target led", () => {
    const intervals = computeGapSkipIntervals([
      { timestamp: "00:00:01.000", endTimestamp: "00:00:03.000" },
      { timestamp: "00:00:07.000", endTimestamp: "00:00:09.000" },
    ]);

    expect(intervals).toEqual([
      { start: 3, target: 7 - GAP_SKIP_LAND_LEAD_SECONDS },
    ]);
  });

  it("excludes gaps of at most the threshold", () => {
    // 2s gap (exactly the threshold), then a 1.5s gap.
    const intervals = computeGapSkipIntervals([
      { timestamp: "00:00:01.000", endTimestamp: "00:00:03.000" },
      { timestamp: "00:00:05.000", endTimestamp: "00:00:06.500" },
    ]);

    expect(intervals).toEqual([]);
  });

  it("skips messages without a known end time", () => {
    const intervals = computeGapSkipIntervals([
      { timestamp: "00:00:01.000" },
      { timestamp: "00:01:00.000", endTimestamp: "00:01:01.000" },
    ]);

    expect(intervals).toEqual([]);
  });

  it("applies the transcript/video sync offset", () => {
    const intervals = computeGapSkipIntervals(
      [
        { timestamp: "00:01:00.000", endTimestamp: "00:01:05.000" },
        { timestamp: "00:01:10.000", endTimestamp: "00:01:11.000" },
      ],
      {
        transcriptStartTime: "00:01:00.000",
        videoStartTime: "00:00:30.000",
      },
    );

    // transcript 00:01:05 -> video 00:00:35; 00:01:10 -> video 00:00:40, led.
    expect(intervals).toEqual([
      { start: 35, target: 40 - GAP_SKIP_LAND_LEAD_SECONDS },
    ]);
  });
});

describe("findGapSkipTarget", () => {
  it("waits GAP_SKIP_WAIT_SECONDS into the gap before offering a skip", () => {
    expect(findGapSkipTarget(10, INTERVALS)).toBeNull();
    expect(findGapSkipTarget(10 + GAP_SKIP_WAIT_SECONDS - 0.01, INTERVALS)).toBeNull();
    expect(findGapSkipTarget(10 + GAP_SKIP_WAIT_SECONDS, INTERVALS)).toBe(14);
  });

  it("returns the next message start from anywhere inside a gap", () => {
    expect(findGapSkipTarget(12.5, INTERVALS)).toBe(14);
    expect(findGapSkipTarget(30, INTERVALS)).toBe(35);
  });

  it("plays out the final GAP_SKIP_MIN_REMAINING_SECONDS of a gap naturally", () => {
    expect(findGapSkipTarget(13.5, INTERVALS)).toBeNull();
    expect(findGapSkipTarget(34.5, INTERVALS)).toBeNull();
  });

  it("returns null outside any gap, after the target, and with no intervals", () => {
    expect(findGapSkipTarget(9, INTERVALS)).toBeNull();
    expect(findGapSkipTarget(17, INTERVALS)).toBeNull();
    expect(findGapSkipTarget(100, INTERVALS)).toBeNull();
    expect(findGapSkipTarget(14, INTERVALS)).toBeNull();
    expect(findGapSkipTarget(35, INTERVALS)).toBeNull();
    expect(findGapSkipTarget(12.5, [])).toBeNull();
  });
});
