/**
 * Projects the All Core Devs call schedule forward, so a phase on the timeline can be read
 * in the unit the work is actually done in: how many calls it has left.
 *
 * ACD runs every Thursday, alternating Execution and Consensus. That cadence is a convention
 * rather than anything recorded in the repo, so this is a projection — holiday and conference
 * weeks do get skipped, and a count across such a stretch will read one or two high.
 */

export type AcdSeries = 'ACDE' | 'ACDC';

export interface AcdCall {
  date: Date;
  series: AcdSeries;
}

/**
 * A call that did happen, to phase the alternation against. Any past Thursday would do; this
 * one is ACDE #245. Held as parts rather than a string so it lands at local midnight, matching
 * the dates the timeline parses out of the phase data.
 */
const ANCHOR = { year: 2026, month: 8, day: 10 } as const;
const ANCHOR_SERIES: AcdSeries = 'ACDE';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight local, so a call on the phase's own end date counts as inside the span. */
const atMidnight = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Calendar-day arithmetic, not milliseconds: a week spanning a daylight-saving change is 167
 * or 169 hours, which would walk a Thursday onto the Wednesday before it.
 */
const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Rounded, for the same reason — the two midnights can sit an hour apart. */
const daysApart = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);

const otherSeries = (series: AcdSeries): AcdSeries => (series === 'ACDE' ? 'ACDC' : 'ACDE');

/**
 * Every ACD call falling within `[start, end]`, inclusive of both ends, in date order.
 * Empty if the range is inverted.
 */
export function acdCallsBetween(start: Date, end: Date): AcdCall[] {
  const from = atMidnight(start);
  const to = atMidnight(end);
  if (to < from) return [];

  const anchor = new Date(ANCHOR.year, ANCHOR.month, ANCHOR.day);
  // Whole weeks to the first call at or after `from`. Rounding up keeps a range that opens
  // mid-week from claiming the Thursday behind it.
  const firstWeek = Math.ceil(daysApart(anchor, from) / 7);

  const calls: AcdCall[] = [];
  for (let week = firstWeek; ; week++) {
    const date = addDays(anchor, week * 7);
    if (date > to) break;
    // `week` runs negative for ranges before the anchor, where `%` keeps the sign.
    const isAnchorSeries = ((week % 2) + 2) % 2 === 0;
    calls.push({ date, series: isAnchorSeries ? ANCHOR_SERIES : otherSeries(ANCHOR_SERIES) });
  }
  return calls;
}
