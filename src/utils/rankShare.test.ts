import { describe, expect, it } from "vitest";
import { decodeRankingsHash, encodeRankingsHash } from "./rankShare";

const TIERS = ["S", "A", "B", "C", "D"];

describe("rankShare", () => {
  it("encodes rankings grouped by tier in display order", () => {
    const rankings = new Map<number, string>([
      [7623, "A"],
      [7708, "S"],
      [7702, "S"],
    ]);

    expect(encodeRankingsHash(rankings, TIERS)).toBe("#r=S:7702,7708;A:7623");
  });

  it("encodes nothing-ranked as an empty string", () => {
    expect(encodeRankingsHash(new Map(), TIERS)).toBe("");
  });

  it("round-trips through encode and decode", () => {
    const rankings = new Map<number, string>([
      [7702, "S"],
      [7623, "A"],
      [7212, "D"],
    ]);

    const decoded = decodeRankingsHash(
      encodeRankingsHash(rankings, TIERS),
      TIERS
    );

    expect(decoded).toEqual(rankings);
  });

  it("decodes percent-encoded copies of the fragment", () => {
    expect(decodeRankingsHash("#r=S%3A7702%2C7708", TIERS)).toEqual(
      new Map([
        [7702, "S"],
        [7708, "S"],
      ])
    );
  });

  it("rejects hashes it did not produce", () => {
    expect(decodeRankingsHash("", TIERS)).toBeNull();
    expect(decodeRankingsHash("#other", TIERS)).toBeNull();
    expect(decodeRankingsHash("#r=", TIERS)).toBeNull();
    expect(decodeRankingsHash("#r=S", TIERS)).toBeNull();
    expect(decodeRankingsHash("#r=S:7702:extra", TIERS)).toBeNull();
    expect(decodeRankingsHash("#r=X:7702", TIERS)).toBeNull();
    expect(decodeRankingsHash("#r=S:77o2", TIERS)).toBeNull();
    expect(decodeRankingsHash("#r=S:%ZZ", TIERS)).toBeNull();
  });

  it("keeps EIP numbers unknown to the caller for the caller to merge", () => {
    expect(decodeRankingsHash("#r=S:999999", TIERS)).toEqual(
      new Map([[999999, "S"]])
    );
  });

  it("keeps the last tier when an EIP appears twice", () => {
    expect(decodeRankingsHash("#r=S:7702;A:7702", TIERS)).toEqual(
      new Map([[7702, "A"]])
    );
  });
});
