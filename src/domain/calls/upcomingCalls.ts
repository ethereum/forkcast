import { protocolCalls, type CallType } from '../../data/calls';
import { formatDateInTimeZone, getTodayDateString } from '../../utils/localDate';

export interface UpcomingCall {
  type: CallType;
  title: string;
  date: string;
  startTimeUtc?: string;
  number: string;
  githubUrl: string;
  issueNumber: number;
  youtubeUrl?: string;
}

interface GitHubIssue {
  title: string;
  html_url: string;
  created_at: string;
  state: string;
  number: number;
  body?: string;
}

interface GitHubComment {
  body?: string;
}

const UTC_DATE_TIME_SECTION_RE = /### UTC Date & Time[\s\S]{0,200}?([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}),\s*(\d{1,2}):(\d{2})\s*UTC/i;
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
};

// Fetch YouTube URL from issue comments
async function fetchYouTubeFromIssue(issueNumber: number): Promise<string | undefined> {
  try {
    const response = await fetch(`https://api.github.com/repos/ethereum/pm/issues/${issueNumber}/comments`);
    if (!response.ok) return undefined;

    const comments: GitHubComment[] = await response.json();
    for (const comment of comments) {
      // Match: ✅ **YouTube Live**: [Watch Live](URL)
      const match = comment.body?.match(/YouTube Live.*?\[.*?\]\((https?:\/\/[^\s)]+)\)/i);
      if (match) return match[1];
    }
    return undefined;
  } catch {
    return undefined;
  }
}

const normalizeUtcTime = (hoursString: string, minutesString: string): string => {
  const hours = String(Number(hoursString)).padStart(2, '0');
  return `${hours}:${minutesString}`;
};

const buildUtcDateTime = (dateString: string, timeString: string): string => `${dateString}T${timeString}:00Z`;

interface ResolvedUpcomingCallSchedule {
  date: string;
  startTimeUtc: string;
}

const normalizeCallSeries = (series: string): string => series.trim().toLowerCase().replace(/\s+/g, ' ');

export const resolveUpcomingCallSeries = (issueBody?: string): string | undefined => {
  const match = issueBody?.match(CALL_SERIES_SECTION_RE);
  if (!match) return undefined;

  return normalizeCallSeries(match[1]);
};

const getUpcomingCallStartDateTime = (startTimeUtc?: string): Date | null => {
  if (!startTimeUtc) return null;

  const callStart = new Date(startTimeUtc);
  return Number.isNaN(callStart.getTime()) ? null : callStart;
};

export const getUpcomingCallBucketDate = (
  call: Pick<UpcomingCall, 'date' | 'startTimeUtc'>,
  timeZone?: string
): string => {
  const callStart = getUpcomingCallStartDateTime(call.startTimeUtc);
  if (!callStart) return call.date;

  return formatDateInTimeZone(callStart, timeZone);
};

export const isUpcomingCallStillRelevant = (
  call: Pick<UpcomingCall, 'date' | 'startTimeUtc'>,
  now: Date = new Date(),
  timeZone?: string
): boolean => getUpcomingCallBucketDate(call, timeZone) >= getTodayDateString(now, timeZone);

export const resolveUpcomingCallSchedule = (
  issueBody?: string
): ResolvedUpcomingCallSchedule | undefined => {
  const sectionMatch = issueBody?.match(UTC_DATE_TIME_SECTION_RE);
  if (!sectionMatch) return undefined;

  const explicitDate = parseCallDate(sectionMatch[1]);
  if (!explicitDate) return undefined;

  return {
    date: explicitDate,
    startTimeUtc: buildUtcDateTime(explicitDate, normalizeUtcTime(sectionMatch[2], sectionMatch[3]))
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

const resolveUpcomingCallNumber = (title: string): string | undefined => {
  const match = title.match(/#\s*(\d+)/);
  if (!match) return undefined;

  return match[1].padStart(3, '0');
};

// Parse call info from GitHub issue title
// Examples: "All Core Devs - Consensus (ACDC) #166, October 2, 2025"
//           "All Core Devs - Execution (ACDE) #222, October 9, 2025"
//           "All Core Devs - Testing (ACDT) #56, Oct 6, 2025"
//           "All Core Devs - Consensus (ACDC) #168, October 30, 2025 🎃"
//           "EIP-7732 Breakout Room Call #27, November 7, 2025"
//           "FOCIL Breakout #22, October 21, 2025"
//           "EIP-7928 Breakout #5, Oct 22, 2025"
function parseCallFromTitle(
  title: string,
  githubUrl: string,
  issueNumber: number,
  issueBody?: string
): Omit<UpcomingCall, 'youtubeUrl'> | null {
  const schedule = resolveUpcomingCallSchedule(issueBody);
  if (!schedule) return null;
  const type = resolveUpcomingCallType(title, issueBody);
  const number = resolveUpcomingCallNumber(title);
  if (!type || !number) return null;

  return {
    type,
    title: title.trim(),
    date: schedule.date,
    startTimeUtc: schedule.startTimeUtc,
    number,
    githubUrl,
    issueNumber
  };
}

// Convert date strings like "October 2, 2025" or "Oct 6, 2025" to YYYY-MM-DD format
function parseCallDate(dateStr: string): string | null {
  try {
    // Extract just the date portion, handling trailing emojis or other characters
    // Match patterns like "October 30, 2025" or "Oct 6, 2025"
    const dateMatch = dateStr.match(/([A-Za-z]+\s+\d{1,2},\s*\d{4})/);
    const cleanDateStr = dateMatch ? dateMatch[1] : dateStr.trim();

    // Handle formats like "October 2, 2025" or "Oct 6, 2025"
    const date = new Date(cleanDateStr);
    if (isNaN(date.getTime())) return null;

    // Format as YYYY-MM-DD using local date components to avoid timezone shifts
    // This ensures "January 29, 2026" always becomes "2026-01-29" regardless of timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

// Fetch upcoming ACD calls from GitHub issues
export async function fetchUpcomingCalls(): Promise<UpcomingCall[]> {
  try {
    const response = await fetch('https://api.github.com/repos/ethereum/pm/issues?state=open&per_page=20');

    if (!response.ok) {
      console.warn('Failed to fetch GitHub issues:', response.status);
      return [];
    }

    const issues: GitHubIssue[] = await response.json();
    const parsedCalls: Omit<UpcomingCall, 'youtubeUrl'>[] = [];
    // Create a set of completed call identifiers (type + number)
    const completedCallIds = new Set(
      protocolCalls.map(call => `${call.type}-${call.number}`)
    );

    // Track one call per type
    const foundTypes = new Set<string>();

    for (const issue of issues) {
      const call = parseCallFromTitle(issue.title, issue.html_url, issue.number, issue.body);

      if (call && isUpcomingCallStillRelevant(call) && !foundTypes.has(call.type)) {
        // Check if this call already exists in completed calls
        const callId = `${call.type}-${call.number}`;
        if (!completedCallIds.has(callId)) {
          parsedCalls.push(call);
          foundTypes.add(call.type);
        }
      }
    }

    // Fetch YouTube URLs in parallel
    const youtubeUrls = await Promise.all(
      parsedCalls.map(call => fetchYouTubeFromIssue(call.issueNumber))
    );

    // Combine parsed calls with YouTube URLs
    const upcomingCalls: UpcomingCall[] = parsedCalls.map((call, index) => ({
      ...call,
      youtubeUrl: youtubeUrls[index]
    }));

    // Sort by date
    return upcomingCalls.sort((a, b) => a.date.localeCompare(b.date));

  } catch (error) {
    console.error('Error fetching upcoming calls:', error);
    return [];
  }
}
