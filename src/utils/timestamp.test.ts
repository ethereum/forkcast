import { describe, expect, it } from "vitest";
import {
  PRE_RECORDING_LABEL,
  getAdjustedVideoTime,
  getDisplayTimestamp,
  secondsToCompactTimestamp,
  secondsToTimestamp,
  timestampToSeconds,
} from "./timestamp";

// Transcript runs 00:06:00 ahead of the video.
const SYNC = { transcriptStartTime: "00:07:30", videoStartTime: "00:01:30" };

describe("timestampToSeconds", () => {
  it("parses HH:MM:SS and keeps milliseconds", () => {
    expect(timestampToSeconds("01:02:03")).toBe(3723);
    expect(timestampToSeconds("00:00:01.500")).toBe(1.5);
  });

  it("returns 0 for missing or malformed timestamps", () => {
    expect(timestampToSeconds(null)).toBe(0);
    expect(timestampToSeconds(undefined)).toBe(0);
    expect(timestampToSeconds("")).toBe(0);
    expect(timestampToSeconds("02:03")).toBe(0);
  });
});

describe("secondsToTimestamp", () => {
  it("formats zero-padded HH:MM:SS, flooring fractions", () => {
    expect(secondsToTimestamp(0)).toBe("00:00:00");
    expect(secondsToTimestamp(3723.9)).toBe("01:02:03");
  });

  it("prefixes negative values with a minus sign", () => {
    expect(secondsToTimestamp(-65)).toBe("-00:01:05");
  });
});

describe("secondsToCompactTimestamp", () => {
  it("leaves hours and minutes unpadded, showing zero hours as 00", () => {
    expect(secondsToCompactTimestamp(425)).toBe("00:7:05");
    expect(secondsToCompactTimestamp(3843)).toBe("1:4:03");
    expect(secondsToCompactTimestamp(0)).toBe("00:0:00");
  });
});

describe("getAdjustedVideoTime", () => {
  it("subtracts the sync offset and ignores milliseconds", () => {
    expect(getAdjustedVideoTime("00:10:00.900", SYNC)).toBe(240);
  });

  it("returns transcript time when sync is missing or incomplete", () => {
    expect(getAdjustedVideoTime("00:10:00")).toBe(600);
    expect(getAdjustedVideoTime("00:10:00", null)).toBe(600);
    expect(
      getAdjustedVideoTime("00:10:00", { transcriptStartTime: null, videoStartTime: null }),
    ).toBe(600);
  });
});

describe("getDisplayTimestamp", () => {
  it("formats the sync-adjusted time", () => {
    expect(getDisplayTimestamp("00:10:00.000", SYNC)).toBe("00:04:00");
  });

  it("labels moments before the recording starts", () => {
    expect(getDisplayTimestamp("00:05:00", SYNC)).toBe(PRE_RECORDING_LABEL);
  });
});
