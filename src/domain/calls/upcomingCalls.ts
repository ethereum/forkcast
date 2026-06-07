import { protocolCalls, type CallType } from '../../data/calls';
import { formatDateInTimeZone, getTodayDateString } from '../../utils/localDate';
import upcomingCallsSnapshot from '../../data/generated/upcoming-calls.json';
import {
  parseUpcomingCallFromIssue,
  extractYouTubeUrl,
  type ParsedUpcomingCall,
  type UpcomingCallIssue,
} from './upcomingCallParsing';

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

/**
 * Build-time snapshot of upcoming calls (refreshed by snapshot-runtime-routes.mjs).
 * Islands and Astro's getStaticPaths() both read this so the call index only links
 * to upcoming-call watch pages the static build actually emitted. `fetchUpcomingCalls`
 * below is the live read used for the "next call" hints on the agenda/EIP pages
 * (external links only — see hasUpcomingWatchPage), not for routing.
 */
export const upcomingCalls: UpcomingCall[] = upcomingCallsSnapshot as UpcomingCall[];

/**
 * Whether an upcoming call has an internal watch page. The build emits a
 * `/calls/{type}/{number}` watch page only when there is a video to watch, and
 * the call index links such calls internally; calls without one link out to the
 * GitHub issue. This single predicate keeps getStaticPaths() and the island's
 * internal-vs-external link decision in agreement.
 */
export const hasUpcomingWatchPage = (call: Pick<UpcomingCall, 'youtubeUrl'>): boolean =>
  Boolean(call.youtubeUrl);

interface GitHubIssue {
  title: string;
  html_url: string;
  created_at: string;
  state: string;
  number: number;
  body?: string;
}

// Fetch the call's YouTube URL from its issue comments (parsing shared with the
// build snapshot via extractYouTubeUrl).
async function fetchYouTubeFromIssue(issueNumber: number): Promise<string | undefined> {
  try {
    const response = await fetch(`https://api.github.com/repos/ethereum/pm/issues/${issueNumber}/comments`);
    if (!response.ok) return undefined;
    return extractYouTubeUrl(await response.json());
  } catch {
    return undefined;
  }
}

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

// Fetch upcoming ACD calls from GitHub issues. Shares the parsing rules with the
// build snapshot via parseUpcomingCallFromIssue (upcomingCallParsing.ts).
export async function fetchUpcomingCalls(): Promise<UpcomingCall[]> {
  try {
    const response = await fetch('https://api.github.com/repos/ethereum/pm/issues?state=open&per_page=20');

    if (!response.ok) {
      console.warn('Failed to fetch GitHub issues:', response.status);
      return [];
    }

    const issues: GitHubIssue[] = await response.json();
    const completedCallIds = new Set(protocolCalls.map(call => `${call.type}-${call.number}`));
    const foundTypes = new Set<string>();
    const parsedCalls: ParsedUpcomingCall[] = [];

    for (const issue of issues) {
      const call = parseUpcomingCallFromIssue(issue as UpcomingCallIssue);
      if (!call) continue;
      if (!isUpcomingCallStillRelevant(call)) continue;
      if (foundTypes.has(call.type)) continue;
      if (completedCallIds.has(`${call.type}-${call.number}`)) continue;

      parsedCalls.push(call);
      foundTypes.add(call.type);
    }

    const youtubeUrls = await Promise.all(
      parsedCalls.map(call => fetchYouTubeFromIssue(call.issueNumber))
    );

    return parsedCalls
      .map((call, index): UpcomingCall => ({ ...call, youtubeUrl: youtubeUrls[index] }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching upcoming calls:', error);
    return [];
  }
}
