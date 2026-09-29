import generatedCalls from './protocol-calls.generated.json';
import { getTodayDateString } from '../utils/localDate';
import { getCallTypeName, type CallType } from './callSeries';

export { callTypeNames, getCallTypeName } from './callSeries';
export type { CallType } from './callSeries';

export interface Call {
  type: string;
  date: string;
  number: string;
  path: string;
  name?: string;
  /** This call's subject, for series that give each call its own theme. */
  topic?: string;
  issue?: number;
}

// Badge text for series whose slug is too long for the badge pill.
const callTypeBadgeLabels: Partial<Record<CallType, string>> = {
  ethproofs: 'EP',
};

export const getCallTypeBadgeLabel = (type: string): string =>
  callTypeBadgeLabels[type as CallType] ?? type.toUpperCase();

export const protocolCalls: Call[] = generatedCalls as Call[];

export const isOneOffCall = (type: string): boolean => type.startsWith('one-off-');

export const getCallDisplayName = (call: Call): string =>
  call.name || getCallTypeName(call.type);

// Helper to get recent calls
export const getRecentCalls = (limit: number = 5): Call[] => {
  return [...protocolCalls]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
};

// EIP <-> call type associations
export const eipCallTypes: Record<number, CallType> = {
  7732: 'epbs',
  7928: 'bal',
  7805: 'focil',
};

// Get previous and next calls for a given type
export const getCallNavigation = (
  type: string,
  now: Date = new Date(),
  timeZone?: string
): { previous: Call | null; next: Call | null } => {
  const today = getTodayDateString(now, timeZone);
  const calls = protocolCalls
    .filter(c => c.type === type)
    .sort((a, b) => a.date.localeCompare(b.date));

  const pastCalls = calls.filter(c => c.date <= today);
  const futureCalls = calls.filter(c => c.date > today);

  return {
    previous: pastCalls.length > 0 ? pastCalls[pastCalls.length - 1] : null,
    next: futureCalls.length > 0 ? futureCalls[0] : null,
  };
};
