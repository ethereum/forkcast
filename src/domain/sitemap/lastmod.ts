/**
 * Content dates for the routes that genuinely have one, keyed by pathname.
 *
 * Only dated routes get an entry. Google discounts `lastmod` across a whole site
 * when it finds every URL stamped with the build time, so a route with no real
 * content date (an index, a filter view) is worth more with no `lastmod` at all
 * than with a fabricated one.
 */

export interface LastmodSources {
  calls: ReadonlyArray<{ path: string; date: string }>;
  /** From `getStageChanges` — an EIP's most recent dated inclusion-stage move. */
  stageChanges: ReadonlyArray<{ id: number; lastStageChange: string }>;
}

export function buildLastmodMap({ calls, stageChanges }: LastmodSources): Map<string, string> {
  const map = new Map<string, string>();
  for (const call of calls) {
    if (call.date) map.set(`/calls/${call.path}/`, call.date);
  }
  for (const change of stageChanges) {
    if (change.lastStageChange) map.set(`/eips/${change.id}/`, change.lastStageChange);
  }
  return map;
}

/** `YYYY-MM-DD` as the W3C datetime `lastmod` wants, or undefined if unparseable. */
export function toLastmod(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
