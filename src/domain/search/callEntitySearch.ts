/**
 * Finds calls as jump-to entities: "acde 242", "acde242", "ACDE #242", "242",
 * "bal breakout", "2026-07-30". This is how you reach a call page without
 * knowing anything that was said on it.
 */
import { callTypeNames, getCallDisplayName, isOneOffCall, type Call, type CallType } from '../../data/calls';
import type { CallEntityResult } from './types';

const SCORE = {
  /** Series slug + number both matched — unambiguously this call. */
  typeAndNumber: 100,
  date: 80,
  number: 70,
  seriesSlug: 40,
  term: 15,
};

const stripLeadingZeros = (value: string) => value.replace(/^0+(?=\d)/, '');

const callLabel = (call: Call): string =>
  isOneOffCall(call.type)
    ? getCallDisplayName(call)
    : `${call.type.toUpperCase()} #${stripLeadingZeros(call.number)}`;

export function searchCallEntities(query: string, calls: Call[]): CallEntityResult[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  const terms = normalized.split(/\s+/).filter(Boolean);
  // "acde 242" / "acde242" / "ACDE #242" all collapse to the same pair.
  const compact = normalized.replace(/[#\s]/g, '');
  const typeNumber = /^([a-z][a-z0-9-]*?)-?(\d{1,4})$/.exec(compact);
  const bareNumber = /^\d{1,4}$/.test(compact) ? stripLeadingZeros(compact) : null;

  const results: CallEntityResult[] = [];

  for (const call of calls) {
    const number = stripLeadingZeros(call.number);
    const seriesName = getCallDisplayName(call);
    const haystack = `${call.type} ${seriesName} ${callTypeNames[call.type as CallType] ?? ''}`.toLowerCase();

    let score = 0;
    // Only a series + number pair names one specific call, so only that promotes
    // the Calls section ahead of the others.
    let identity = 0;

    if (typeNumber && typeNumber[1] === call.type && stripLeadingZeros(typeNumber[2]) === number) {
      score = SCORE.typeAndNumber;
      identity = 100;
    } else if (bareNumber && bareNumber === number) {
      score = SCORE.number;
    } else if (normalized.length >= 7 && call.date.startsWith(normalized)) {
      score = SCORE.date;
    } else {
      if (terms.includes(call.type)) score += SCORE.seriesSlug;
      score += terms.filter((term) => term !== call.type && haystack.includes(term)).length * SCORE.term;
    }

    if (score === 0) continue;

    results.push({
      kind: 'call',
      call,
      label: callLabel(call),
      seriesName,
      score,
      identity,
      href: `/calls/${call.path}`,
    });
  }

  results.sort((a, b) => b.score - a.score || b.call.date.localeCompare(a.call.date));
  return results.slice(0, 25);
}
