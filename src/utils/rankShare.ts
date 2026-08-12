// Tier rankings <-> URL hash serialization for the tier maker.
//
// Rankings are encoded as "#r=S:7702,7708;A:7623": tiers in display order,
// each with a comma-separated list of EIP numbers, empty tiers omitted.
// All characters are valid in a URL fragment per RFC 3986, so links need no
// escaping and stay human-readable.

const HASH_PREFIX = "#r=";

/**
 * Encode tier assignments (EIP number -> tier id) into a URL hash.
 * Returns "" when nothing is ranked.
 */
export function encodeRankingsHash(
  rankings: ReadonlyMap<number, string>,
  tierOrder: readonly string[]
): string {
  const groups: string[] = [];
  for (const tier of tierOrder) {
    const ids = [...rankings]
      .filter(([, t]) => t === tier)
      .map(([id]) => id)
      .sort((a, b) => a - b);
    if (ids.length > 0) {
      groups.push(`${tier}:${ids.join(",")}`);
    }
  }
  return groups.length > 0 ? HASH_PREFIX + groups.join(";") : "";
}

/**
 * Decode a URL hash into tier assignments (EIP number -> tier id).
 * Returns null for hashes this module did not produce or cannot fully
 * validate. EIP numbers unknown to the caller are returned as-is; merging
 * against the current EIP set is the caller's job.
 */
export function decodeRankingsHash(
  hash: string,
  validTiers: readonly string[]
): Map<number, string> | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  let body: string;
  try {
    // Tolerate percent-encoded copies of the fragment (e.g. from chat apps).
    body = decodeURIComponent(hash.slice(HASH_PREFIX.length));
  } catch {
    return null;
  }
  const rankings = new Map<number, string>();
  for (const group of body.split(";")) {
    const [tier, idList, ...rest] = group.split(":");
    if (rest.length > 0 || idList === undefined || !validTiers.includes(tier)) {
      return null;
    }
    for (const idStr of idList.split(",")) {
      if (!/^\d+$/.test(idStr)) return null;
      rankings.set(Number(idStr), tier);
    }
  }
  return rankings.size > 0 ? rankings : null;
}
