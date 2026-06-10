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
 * Islands and Astro's getStaticPaths() both read this so static routes and the
 * initial call index agree. `fetchUpcomingCalls` below is the live read used for
 * per-visit freshness; see hasUpcomingWatchPage for the static-route guard that
 * keeps live data from linking to pages the build did not emit.
 */
export const upcomingCalls: UpcomingCall[] = upcomingCallsSnapshot as UpcomingCall[];

const upcomingCallId = (call: Pick<UpcomingCall, 'type' | 'number'>): string =>
  `${call.type}-${call.number}`;

export const hasUpcomingVideo = (call: Pick<UpcomingCall, 'youtubeUrl'>): boolean =>
  Boolean(call.youtubeUrl);

/**
 * Build a predicate for whether an upcoming call has a static internal watch
 * page. The page exists only when that call was in the build-time snapshot with
 * a video URL. Live-fetched calls may also have videos, but they must link out
 * unless the current static build emitted their `/calls/{type}/{number}` page.
 */
export const createUpcomingWatchPagePredicate = (
  snapshot: ReadonlyArray<UpcomingCall>
): ((call: Pick<UpcomingCall, 'type' | 'number'>) => boolean) => {
  const watchPageIds = new Set(snapshot.filter(hasUpcomingVideo).map(upcomingCallId));

  return (call) => watchPageIds.has(upcomingCallId(call));
};

export const hasUpcomingWatchPage = createUpcomingWatchPagePredicate(upcomingCalls);

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

const fetchUpcomingCallsFromGitHub = async (): Promise<UpcomingCall[]> => {
  const response = await fetch('https://api.github.com/repos/ethereum/pm/issues?state=open&per_page=20');

  if (!response.ok) {
    throw new Error(`GitHub issues fetch failed: ${response.status}`);
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
};

// Fetch upcoming ACD calls from GitHub issues. Shares the parsing rules with the
// build snapshot via parseUpcomingCallFromIssue (upcomingCallParsing.ts).
export async function fetchUpcomingCalls(): Promise<UpcomingCall[]> {
  try {
    return await fetchUpcomingCallsFromGitHub();
  } catch (error) {
    console.error('Error fetching upcoming calls:', error);
    return [];
  }
}

export async function fetchUpcomingCallsIfAvailable(): Promise<UpcomingCall[] | undefined> {
  try {
    return await fetchUpcomingCallsFromGitHub();
  } catch (error) {
    console.warn('Live upcoming calls refresh failed:', error);
    return undefined;
  }
}
