import type { CallType } from '../../data/calls';

/**
 * Pure parsing of an `ethereum/pm` GitHub issue into an upcoming protocol call.
 *
 * This is the single source of truth for the upcoming-call parsing rules: the
 * series→type map, the issue-body section regexes, and date/number normalization.
 * Both consumers read these rules from here so they cannot drift:
 *
 *   1. The build-time snapshot script (scripts/snapshot-runtime-routes.mjs), which
 *      Node type-strips this module on import.
 *   2. The runtime `fetchUpcomingCalls` path in upcomingCalls.ts.
 *
 * The unit tests in upcomingCalls.test.ts cover this module through the re-exports
 * in upcomingCalls.ts. Keep this module pure: no I/O, no data imports beyond the
 * `CallType` type (which is erased at build, so the snapshot script never loads
 * the calls data module).
 */

const UTC_DATE_TIME_SECTION_RE =
  /### UTC Date & Time[\s\S]{0,200}?([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}),\s*(\d{1,2}):(\d{2})\s*UTC/i;
const CALL_SERIES_SECTION_RE = /### Call Series\s*\n\s*\n([^\n\r]+)/i;

const UPCOMING_CALL_SERIES_TO_TYPE: Record<string, CallType> = {
  'all core devs - consensus': 'acdc',
  'all core devs - execution': 'acde',
  'all core devs - testing': 'acdt',
  'all wallet devs': 'awd',
  'pq interop': 'pqi',
  'pq transaction signatures': 'pqts',
  'l1-zkevm breakout': 'zkevm',
  'fast confirmation rule': 'fcr',
  'rpc standards': 'rpc',
  'focil breakout': 'focil',
  'eip-7928 breakout room': 'bal',
  'eip-7732 breakout room': 'epbs',
  'glamsterdam repricings': 'price',
  'trustless log index': 'tli',
  'encrypt the mempool': 'etm',
  'native account abstraction': 'aa',
  'p2p networking': 'p2p',
  'ssz engine api': 'ssz',
};

const normalizeCallSeries = (series: string): string =>
  series.trim().toLowerCase().replace(/\s+/g, ' ');

export const resolveUpcomingCallSeries = (issueBody?: string): string | undefined => {
  const match = issueBody?.match(CALL_SERIES_SECTION_RE);
  if (!match) return undefined;

  return normalizeCallSeries(match[1]);
};

const normalizeUtcTime = (hoursString: string, minutesString: string): string => {
  const hours = String(Number(hoursString)).padStart(2, '0');
  return `${hours}:${minutesString}`;
};

const buildUtcDateTime = (dateString: string, timeString: string): string =>
  `${dateString}T${timeString}:00Z`;

export interface ResolvedUpcomingCallSchedule {
  date: string;
  startTimeUtc: string;
}

export const resolveUpcomingCallSchedule = (
  issueBody?: string,
): ResolvedUpcomingCallSchedule | undefined => {
  const sectionMatch = issueBody?.match(UTC_DATE_TIME_SECTION_RE);
  if (!sectionMatch) return undefined;

  const explicitDate = parseCallDate(sectionMatch[1]);
  if (!explicitDate) return undefined;

  return {
    date: explicitDate,
    startTimeUtc: buildUtcDateTime(explicitDate, normalizeUtcTime(sectionMatch[2], sectionMatch[3])),
  };
};

const resolveUpcomingCallTypeFromTitle = (title: string): CallType | undefined => {
  if (/\(ACDC\)/i.test(title)) return 'acdc';
  if (/\(ACDE\)/i.test(title)) return 'acde';
  if (/\(ACDT\)/i.test(title)) return 'acdt';
  if (/EIP-7732|ePBS/i.test(title)) return 'epbs';
  if (/EIP-7928/i.test(title)) return 'bal';
  if (/FOCIL/i.test(title)) return 'focil';
  if (/RPC Standards/i.test(title)) return 'rpc';
  if (/L1-zkEVM/i.test(title)) return 'zkevm';
  if (/\(PQTS\)|Post Quantum transaction signature/i.test(title)) return 'pqts';
  if (/(?:Post-Quantum\s*\(PQ\)|PQ)\s*Interop/i.test(title)) return 'pqi';
  if (/Fast Confirmation Rule|\(FCR\)/i.test(title)) return 'fcr';
  if (/All\s*Wallet\s*Devs|AllWalletDevs/i.test(title)) return 'awd';
  if (/SSZ Engine API/i.test(title)) return 'ssz';

  return undefined;
};

export const resolveUpcomingCallType = (title: string, issueBody?: string): CallType | undefined => {
  const callSeries = resolveUpcomingCallSeries(issueBody);
  if (callSeries) {
    const typeFromSeries = UPCOMING_CALL_SERIES_TO_TYPE[callSeries];
    if (typeFromSeries) return typeFromSeries;
  }

  return resolveUpcomingCallTypeFromTitle(title);
};

export const resolveUpcomingCallNumber = (title: string): string | undefined => {
  const match = title.match(/#\s*(\d+)/);
  if (!match) return undefined;

  return match[1].padStart(3, '0');
};

// Convert date strings like "October 2, 2025" or "Oct 6, 2025" to YYYY-MM-DD,
// tolerating trailing emojis/characters. Uses local date components so the same
// calendar date is produced regardless of the parser's timezone.
export function parseCallDate(dateStr: string): string | null {
  const dateMatch = dateStr.match(/([A-Za-z]+\s+\d{1,2},\s*\d{4})/);
  const cleanDateStr = dateMatch ? dateMatch[1] : dateStr.trim();

  const date = new Date(cleanDateStr);
  if (isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface UpcomingCallIssue {
  title: string;
  html_url: string;
  number: number;
  body?: string;
}

/**
 * Extract the YouTube watch URL ACDbot posts in an issue's comments, e.g.
 * "✅ **YouTube Live**: [Watch Live](https://…)". Pure over already-fetched
 * comments — the network fetch stays at the edges. Shared by the runtime hint
 * and the build snapshot so the rule has one home: whether a call has a video
 * decides whether it gets an internal watch page (see hasUpcomingWatchPage).
 */
export function extractYouTubeUrl(comments: ReadonlyArray<{ body?: string }>): string | undefined {
  for (const comment of comments) {
    const match = comment.body?.match(/YouTube Live.*?\[.*?\]\((https?:\/\/[^\s)]+)\)/i);
    if (match) return match[1];
  }
  return undefined;
}

/** The shape produced by parsing alone, before the YouTube URL is attached. */
export interface ParsedUpcomingCall {
  type: CallType;
  title: string;
  date: string;
  startTimeUtc: string;
  number: string;
  githubUrl: string;
  issueNumber: number;
}

/**
 * Parse a single GitHub issue into an upcoming call, or null when it is not a
 * schedulable call (no UTC date/time section, or an unrecognized series/number).
 * Title examples:
 *   "All Core Devs - Consensus (ACDC) #166, October 2, 2025"
 *   "EIP-7732 Breakout Room Call #27, November 7, 2025"
 *   "FOCIL Breakout #22, October 21, 2025"
 */
export function parseUpcomingCallFromIssue(issue: UpcomingCallIssue): ParsedUpcomingCall | null {
  const schedule = resolveUpcomingCallSchedule(issue.body);
  if (!schedule) return null;

  const type = resolveUpcomingCallType(issue.title, issue.body);
  const number = resolveUpcomingCallNumber(issue.title);
  if (!type || !number) return null;

  return {
    type,
    title: issue.title.trim(),
    date: schedule.date,
    startTimeUtc: schedule.startTimeUtc,
    number,
    githubUrl: issue.html_url,
    issueNumber: issue.number,
  };
}
