/**
 * Bots stamp their output with a run timestamp (scrapedAt, ...). Rewriting it
 * every run makes git see a change, so the bot commits and main redeploys even
 * when nothing else moved. Keep the previous value when the rest of the content
 * is identical, so the timestamp means "last changed" and a no-op run leaves the
 * file byte-for-byte unchanged.
 */

/**
 * The same data with every object's keys in sorted order. Callers assemble their
 * output with conditional fields, so two runs can agree on content yet disagree
 * on key order; comparing the canonical form keeps that from reading as a change.
 */
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function keepTimestampIfUnchanged(next, prev, key) {
  if (!prev || prev[key] == null) return next;
  const { [key]: _next, ...nextRest } = next;
  const { [key]: _prev, ...prevRest } = prev;
  const unchanged =
    JSON.stringify(canonicalize(nextRest)) ===
    JSON.stringify(canonicalize(prevRest));
  return unchanged ? { ...next, [key]: prev[key] } : next;
}
