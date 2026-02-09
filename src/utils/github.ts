import { protocolCalls } from '../data/calls';

export interface UpcomingCall {
  type: 'acdc' | 'acde' | 'acdt' | 'focil' | 'bal' | 'epbs' | 'rpc';
  title: string;
  date: string;
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
}

interface GitHubComment {
  body?: string;
}

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

// Parse call info from GitHub issue title
// Examples: "All Core Devs - Consensus (ACDC) #166, October 2, 2025"
//           "All Core Devs - Execution (ACDE) #222, October 9, 2025"
//           "All Core Devs - Testing (ACDT) #56, Oct 6, 2025"
//           "All Core Devs - Consensus (ACDC) #168, October 30, 2025 🎃"
//           "EIP-7732 Breakout Room Call #27, November 7, 2025"
//           "FOCIL Breakout #22, October 21, 2025"
//           "EIP-7928 Breakout #5, Oct 22, 2025"
function parseCallFromTitle(title: string, githubUrl: string, issueNumber: number): Omit<UpcomingCall, 'youtubeUrl'> | null {
  // Try to match ACD* patterns first (ACDC, ACDE, ACDT)
  const acdMatch = title.match(/\(ACD([CET])\)\s*#(\d+),\s*(.+)/i);

  if (acdMatch) {
    const [, typeChar, number, dateStr] = acdMatch;

    // Map type character to full type
    const typeMap: { [key: string]: 'acdc' | 'acde' | 'acdt' } = {
      'C': 'acdc', // Consensus
      'E': 'acde', // Execution
      'T': 'acdt'  // Testing
    };

    const type = typeMap[typeChar.toUpperCase()];
    if (!type) return null;

    const date = parseCallDate(dateStr.trim());
    if (!date) return null;

    return {
      type,
      title: title.trim(),
      date,
      number: number.padStart(3, '0'),
      githubUrl,
      issueNumber
    };
  }

  // Try to match ePBS pattern: "EIP-7732 Breakout Room Call #27, November 7, 2025"
  const epbsMatch = title.match(/EIP-7732.*?#(\d+),\s*(.+)/i);
  if (epbsMatch) {
    const [, number, dateStr] = epbsMatch;
    const date = parseCallDate(dateStr.trim());
    if (!date) return null;

    return {
      type: 'epbs',
      title: title.trim(),
      date,
      number: number.padStart(3, '0'),
      githubUrl,
      issueNumber
    };
  }

  // Try to match FOCIL pattern: "FOCIL Breakout #22, October 21, 2025"
  const focilMatch = title.match(/FOCIL.*?#(\d+),\s*(.+)/i);
  if (focilMatch) {
    const [, number, dateStr] = focilMatch;
    const date = parseCallDate(dateStr.trim());
    if (!date) return null;

    return {
      type: 'focil',
      title: title.trim(),
      date,
      number: number.padStart(3, '0'),
      githubUrl,
      issueNumber
    };
  }

  // Try to match BAL pattern: "EIP-7928 Breakout #5, Oct 22, 2025"
  const balMatch = title.match(/EIP-7928.*?#(\d+),\s*(.+)/i);
  if (balMatch) {
    const [, number, dateStr] = balMatch;
    const date = parseCallDate(dateStr.trim());
    if (!date) return null;

    return {
      type: 'bal',
      title: title.trim(),
      date,
      number: number.padStart(3, '0'),
      githubUrl,
      issueNumber
    };
  }

  // Try to match RPC Standards pattern: "RPC Standards #20 | February 19, 2026"
  const rpcMatch = title.match(/RPC Standards\s*#\s*(\d+)\s*\|\s*(.+)/i);
  if (rpcMatch) {
    const [, number, dateStr] = rpcMatch;
    const date = parseCallDate(dateStr.trim());
    if (!date) return null;

    return {
      type: 'rpc',
      title: title.trim(),
      date,
      number: number.padStart(3, '0'),
      githubUrl,
      issueNumber
    };
  }

  return null;
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
    const today = new Date().toISOString().split('T')[0];

    // Create a set of completed call identifiers (type + number)
    const completedCallIds = new Set(
      protocolCalls.map(call => `${call.type}-${call.number}`)
    );

    // Track one call per type
    const foundTypes = new Set<string>();

    for (const issue of issues) {
      const call = parseCallFromTitle(issue.title, issue.html_url, issue.number);

      if (call && call.date >= today && !foundTypes.has(call.type)) {
        // Check if this call already exists in completed calls
        const callId = `${call.type}-${call.number}`;
        if (!completedCallIds.has(callId)) {
          parsedCalls.push(call);
          foundTypes.add(call.type);

          // Stop once we have one of each type (ACDC, ACDE, ACDT, FOCIL, BAL, ePBS, RPC)
          if (foundTypes.size === 7) break;
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
