/**
 * Bots stamp their output with a run timestamp (scrapedAt, lastRun, ...).
 * Rewriting it every run makes git see a change, so the bot commits and
 * main redeploys even when nothing else moved. Keep the previous value
 * when the rest of the content is identical, so the timestamp means
 * "last changed" and a no-op run leaves the file byte-for-byte unchanged.
 */
export function keepTimestampIfUnchanged(next, prev, key) {
  if (!prev || prev[key] === undefined) return next;
  const { [key]: _next, ...nextRest } = next;
  const { [key]: _prev, ...prevRest } = prev;
  if (JSON.stringify(nextRest) !== JSON.stringify(prevRest)) return next;
  return { ...next, [key]: prev[key] };
}
