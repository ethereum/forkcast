// Guard against a HackMD layout change (or a half-loaded page) making the
// parsers return little or nothing, which would then overwrite good data.

// Only lists at least this long are guarded; tiny lists legitimately change.
const MIN_GUARDED = 2;

const countRefs = (spec) => Object.values(spec.specReferences ?? {}).filter(Boolean).length;

const METRICS = [
  ['EIPs', (spec) => spec.eips?.length ?? 0],
  ['EL client support rows', (spec) => spec.elClientSupport?.matrix?.length ?? 0],
  ['CL client support rows', (spec) => spec.clClientSupport?.matrix?.length ?? 0],
  ['spec references', countRefs],
];

/**
 * Compare a freshly scraped devnet spec with the one on disk. Returns a
 * description of each list that lost more than half its entries; empty if the
 * new spec is safe to write.
 */
export function findShrinkage(previous, next) {
  const losses = [];
  for (const [label, count] of METRICS) {
    const before = count(previous);
    const after = count(next);
    if (before >= MIN_GUARDED && after < before / 2) {
      losses.push(`${label}: ${before} -> ${after}`);
    }
  }
  return losses;
}
