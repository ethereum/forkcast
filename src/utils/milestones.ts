import type { ForkPhaseProgress, TestnetDetail } from '../types/timeline';

export type DatePrecision = 'day' | 'month' | 'quarter' | 'year';

/** One dated step of a fork: a network activation or a process deadline. */
export interface Milestone {
  /**
   * 'YYYY-MM-DD'. For a coarser `precision`, the first day of the period
   * ('2026-10-01' with 'quarter' is Q4 2026). Omit while the date is TBD.
   */
  date?: string;
  /** How much of `date` is known. Defaults to 'day'. */
  precision?: DatePrecision;
  /** UTC activation time ('YYYY-MM-DD HH:MM:SS'), once the fork has happened. */
  datetime?: string;
  /**
   * Put forward on ACD but not yet agreed. A proposed date never counts as
   * passed: someone has to confirm it happened.
   */
  proposed?: boolean;
  /** Where the date was agreed (or put forward, when `proposed`). */
  source?: string;
  /** When client releases for this fork are due. */
  clientReleases?: string;
}

export type MilestoneStatus = 'completed' | 'upcoming';

/**
 * The UTC date the site was built, 'YYYY-MM-DD'. Statuses derive from it, so a
 * fork flips to completed on the first build after it happens. Injected by
 * astro.config.mjs so the server render and the hydrated islands agree; tests
 * fall back to the real date.
 */
export const BUILD_DATE: string =
  typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toISOString().slice(0, 10);

const toUtcDate = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

export const addDays = (iso: string, days: number): string => {
  const date = toUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const formatDay = (iso: string, month: 'short' | 'long', withYear: boolean): string =>
  toUtcDate(iso).toLocaleDateString('en-US', {
    month,
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });

/**
 * Display text for a milestone date.
 * - 'full':  'Oct 6, 2026' (the shape progress data and upgrade cards use)
 * - 'short': 'Oct 6' (timeline phases, where the year is implied)
 * - 'prose': 'October 6, 2026'
 * - 'prose-short': 'October 6'
 * Coarser precisions ignore the style: 'Oct 2026', 'Q4 2026', '2026'. A
 * milestone with no date is 'TBD'.
 */
export const formatMilestone = (
  milestone: Milestone | undefined,
  style: 'full' | 'short' | 'prose' | 'prose-short' = 'full',
): string => {
  if (!milestone?.date) return 'TBD';
  const { date } = milestone;
  const year = date.slice(0, 4);
  switch (milestone.precision ?? 'day') {
    case 'year':
      return year;
    case 'quarter':
      return `Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1} ${year}`;
    case 'month':
      return toUtcDate(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    default:
      return formatDay(date, style.startsWith('prose') ? 'long' : 'short', !style.endsWith('short'));
  }
};

/**
 * Completed once a day-precision, agreed date is on or before `today`.
 * Anything less certain stays upcoming until the data says otherwise.
 */
export const milestoneStatus = (milestone: Milestone | undefined, today: string): MilestoneStatus => {
  if (!milestone?.date || milestone.proposed || (milestone.precision ?? 'day') !== 'day') return 'upcoming';
  return milestone.date <= today ? 'completed' : 'upcoming';
};

/** A window between two milestones: done when `end` has passed, active once `start` has. */
export const rangeStatus = (
  start: Milestone | undefined,
  end: Milestone | undefined,
  today: string,
): 'completed' | 'in-progress' | 'upcoming' => {
  if (milestoneStatus(end, today) === 'completed') return 'completed';
  if (milestoneStatus(start, today) === 'completed') return 'in-progress';
  return 'upcoming';
};

/** 'Jan 8 - Feb 4', or 'TBD' until both ends are agreed. */
export const formatRange = (start: Milestone | undefined, end: Milestone | undefined): string =>
  start?.date && end?.date && !start.proposed && !end.proposed
    ? `${formatMilestone(start, 'short')} - ${formatMilestone(end, 'short')}`
    : 'TBD';

/** 'ACDE 247' for a forkcast call link, so a source can be cited in prose. */
export const callLabel = (source: string | undefined): string | undefined => {
  const match = source?.match(/\/calls\/([a-z-]+)\/(\d+)/);
  return match ? `${match[1].toUpperCase()} ${match[2]}` : undefined;
};

/**
 * Timeline-phase text for a network deployment. `dateRange` is the date, marked
 * while it's only proposed. `note` cites the ACD decision behind the date, so a
 * milestone without a `source` gets none.
 */
export const deploymentPhase = (
  milestone: Milestone,
  today: string,
): { dateRange: string; note?: string; status: MilestoneStatus } => {
  const status = milestoneStatus(milestone, today);
  const date = formatMilestone(milestone, 'short');
  const call = callLabel(milestone.source);
  let note: string | undefined;
  if (call && !milestone.proposed && milestone.date) {
    const releases = milestone.clientReleases
      ? `, with client releases due ${formatMilestone({ date: milestone.clientReleases }, 'short')}`
      : '';
    note =
      status === 'completed'
        ? `The fork activated on schedule ${date}.`
        : `The ${date} slot was agreed on ${call}${releases}.`;
  }
  return { dateRange: milestone.proposed ? `${date} (proposed)` : date, note, status };
};

const joinNames = (names: string[]): string =>
  names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names.join('');

/**
 * The `public-testnets` progress entry for a fork's testnets, in deployment
 * order: per-testnet status and dates, the phase status, and a one-line summary.
 */
export const testnetsProgress = (
  testnets: { name: string; milestone: Milestone }[],
  today: string,
): Pick<ForkPhaseProgress, 'status' | 'actualStartDate' | 'actualEndDate' | 'progressNotes' | 'testnets'> => {
  const details: TestnetDetail[] = testnets.map(({ name, milestone }) => {
    const status = milestoneStatus(milestone, today);
    if (!milestone.date) return { name, status };
    if (milestone.proposed) {
      return {
        name,
        status,
        proposedDate: formatMilestone(milestone),
        ...(milestone.source ? { proposedSource: milestone.source } : {}),
      };
    }
    return {
      name,
      status,
      date: formatMilestone(milestone),
      ...(milestone.source ? { dateSource: milestone.source } : {}),
    };
  });

  const done = details.filter(t => t.status === 'completed');
  const next = testnets.find(t => milestoneStatus(t.milestone, today) !== 'completed');
  const allDone = done.length === details.length;

  let progressNotes: string;
  if (allDone) {
    progressNotes = testnets.map(t => `${t.name} (${formatMilestone(t.milestone, 'short')})`).join(' → ');
  } else {
    const forked = done.length ? `${joinNames(done.map(t => t.name))} ${done.length > 1 ? 'are' : 'is'} forked` : '';
    const upcoming = !next?.milestone.date
      ? ''
      : next.milestone.proposed
        ? `${next.name} slot proposed for ${formatMilestone(next.milestone, 'short')}`
        : `${next.name} agreed for ${formatMilestone(next.milestone, 'short')}`;
    progressNotes = [forked, upcoming].filter(Boolean).join('; ');
  }

  return {
    status: allDone ? 'completed' : done.length ? 'in-progress' : 'upcoming',
    ...(done.length ? { actualStartDate: done[0].date } : {}),
    ...(allDone ? { actualEndDate: done[done.length - 1].date } : {}),
    progressNotes,
    testnets: details,
  };
};

/** The `mainnet-deployment` progress entry: the target until it ships, then the date. */
export const mainnetProgress = (
  milestone: Milestone,
  today: string,
): Pick<ForkPhaseProgress, 'status' | 'actualEndDate' | 'projectedDate' | 'progressNotes'> =>
  milestoneStatus(milestone, today) === 'completed'
    ? { status: 'completed', actualEndDate: formatMilestone(milestone), progressNotes: 'Mainnet activation complete' }
    : {
        status: 'upcoming',
        projectedDate: formatMilestone(milestone),
        progressNotes: `Target mainnet activation ${formatMilestone(milestone)}`,
      };
