import type { Milestone } from '../utils/milestones';

/**
 * The one place a fork's milestone dates are typed. Timeline phases, progress
 * data, `timelineEvents` (and so the RSS feed), the upgrade cards, `/schedule`,
 * the Glamsterdam testnet banner and page metadata all derive from here, and so
 * does completed/upcoming status (against the build date).
 *
 * Moving a date, agreeing a proposed one, or recording a fork that happened is
 * a one-entry edit here.
 *
 * Network keys are listed in deployment order.
 */
export const forkMilestones = {
  pectra: {
    holesky: { date: '2025-02-24' },
    sepolia: { date: '2025-03-05' },
    mainnet: { date: '2025-05-07' },
  },
  fusaka: {
    devnets: [
      { date: '2025-05-26' },
      { date: '2025-06-09' },
      { date: '2025-06-26' },
      { date: '2025-07-23' },
      { date: '2025-08-08' },
      { date: '2025-09-10' },
    ],
    holesky: { date: '2025-10-01' },
    sepolia: { date: '2025-10-14' },
    hoodi: { date: '2025-10-28' },
    mainnet: { date: '2025-12-03' },
  },
  glamsterdam: {
    headlinerProposalDeadline: { date: '2025-06-20' },
    headlinerSelectionDeadline: { date: '2025-08-14' },
    pfiDeadline: { date: '2025-10-30' },
    cfiDeadline: { date: '2026-01-29' },
    // Holešky is deprecated, so Glamsterdam gets a purpose-built public testnet
    // (glamsterdam-devnet-8) in its place.
    plataberget: { date: '2026-08-13' },
    sepolia: {
      date: '2026-10-06',
      datetime: '2026-10-06 13:53:36',
      // Agreed on ACDC #187 with no objections, and forked on that slot.
      source: 'https://forkcast.org/calls/acdc/187#00:30:33',
    },
    hoodi: {
      date: '2026-10-26',
      // Agreed on ACDE #247 with no pushback, after Sepolia forked.
      source: 'https://forkcast.org/calls/acde/247#00:06:44',
      clientReleases: '2026-10-16',
    },
    mainnet: { date: '2026-10-01', precision: 'quarter' },
  },
  hegota: {
    forkFocusStart: { date: '2026-01-08' },
    headlinerProposalDeadline: { date: '2026-02-04' },
    headlinerSelectionDeadline: { date: '2026-03-26' },
    pfiWindowOpens: { date: '2026-04-09' },
    pfiDeadline: { date: '2026-08-06' },
    // No specific date was put forward — the stated goal is to CFI before
    // Devcon (first week of November), and this is the last ACDC/ACDE call
    // that fits.
    cfiDeadline: { date: '2026-10-29', proposed: true },
    mainnet: { date: '2027-04-01', precision: 'quarter' },
  },
} satisfies Record<string, Record<string, Milestone | Milestone[]>>;

/**
 * Blob-parameter-only forks, keyed like `bpoUpgrades`. They ride on Fusaka, so
 * their testnet activations are listed under the same networks.
 */
export const bpoMilestones = {
  bpo1: {
    holesky: { date: '2025-10-07' },
    sepolia: { date: '2025-10-21' },
    hoodi: { date: '2025-11-05' },
    mainnet: { date: '2025-12-09', datetime: '2025-12-09 14:21:11' },
  },
  bpo2: {
    holesky: { date: '2025-10-13' },
    sepolia: { date: '2025-10-27' },
    hoodi: { date: '2025-11-12' },
    mainnet: { date: '2026-01-07', datetime: '2026-01-07 01:01:11' },
  },
} satisfies Record<string, Record<string, Milestone>>;
