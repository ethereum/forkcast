import { describe, expect, it } from "vitest";
import { splitEipNumbers } from "./TextWithLinks";

const ids = (...eips: number[]) => new Set(eips);
const eip = (id: number, label?: string) => ({ id, label: label ?? String(id) });

describe("splitEipNumbers", () => {
  it("marks digit runs in the allowed set as ids", () => {
    expect(splitEipNumbers("CFI batch: EIP-7906, EIP-8250 and 8131", ids(7906, 8250, 8131))).toEqual([
      "CFI batch: ",
      eip(7906, "EIP-7906"),
      ", ",
      eip(8250, "EIP-8250"),
      " and ",
      eip(8131),
      "",
    ]);
  });

  it("leaves digit runs outside the allowed set plain", () => {
    expect(splitEipNumbers("CFI batch: EIP-7906 and 8131", ids(7906))).toEqual([
      "CFI batch: ",
      eip(7906, "EIP-7906"),
      " and 8131",
    ]);
  });

  it("keeps letter-glued digits plain", () => {
    expect(splitEipNumbers("200M gas, ~10 EIPs on devnet8", ids(8, 10, 200))).toEqual([
      "200M gas, ~10 EIPs on devnet8",
    ]);
  });

  it("returns the whole string when nothing is allowed", () => {
    expect(splitEipNumbers("no numbers at all", ids(8037))).toEqual(["no numbers at all"]);
  });

  it("links digit runs with a word eip prefix, keeping the prefix in the link", () => {
    expect(splitEipNumbers("EIP8037 ships", ids(8037))).toEqual([
      eip(8037, "EIP8037"),
      " ships",
    ]);
    expect(splitEipNumbers("eip-8037 ships", ids(8037))).toEqual([
      eip(8037, "eip-8037"),
      " ships",
    ]);
    expect(splitEipNumbers("so EIP 8037 ships", ids(8037))).toEqual([
      "so ",
      eip(8037, "EIP 8037"),
      " ships",
    ]);
    expect(splitEipNumbers("see eip 8037", ids(8037))).toEqual([
      "see ",
      eip(8037, "eip 8037"),
      "",
    ]);
  });

  it("does not treat eip as a prefix mid-word or in eips", () => {
    expect(splitEipNumbers("theeip 7975 later", ids(7975))).toEqual([
      "theeip ",
      eip(7975),
      " later",
    ]);
    expect(splitEipNumbers("eips 7975 later", ids(7975))).toEqual([
      "eips ",
      eip(7975),
      " later",
    ]);
  });

  it("leaves disallowed prefixed runs plain", () => {
    expect(splitEipNumbers("EIP 9999 ships", ids(8037))).toEqual(["EIP 9999 ships"]);
  });

  it("leaves short digit runs (under 4 digits) plain", () => {
    expect(splitEipNumbers("EIP-8 and 8037", ids(8, 8037))).toEqual(["EIP-8 and ", eip(8037), ""]);
    expect(splitEipNumbers("8 and 3 clients", ids(8, 3))).toEqual(["8 and 3 clients"]);
  });
});
