import type { EIP, InclusionStage } from '../../types/eip';
import {
  getInclusionStageForStatus,
  getLaymanTitle,
  getProposalPrefix as getEipProposalPrefix,
  getStageAbbreviation,
} from '../../utils/eip';

/**
 * One entry in the `/api/eip-stage-changes.json` artifact: an EIP that recently
 * changed inclusion stage, with the fork and stage that triggered the change.
 */
export interface EipStageChange {
  id: number;
  title: string;
  prefix: 'EIP' | 'RIP';
  status: string;
  /** The plain-language rewrite when one has been written, else the spec one-liner. */
  description: string;
  /**
   * The EIP's own one-liner from its spec preamble, never the plain-language
   * rewrite. Empty when the EIP has none. `/feed.xml` uses this: the rewrite is
   * hand-authored prose that gets revised, and a feed item can't be recalled.
   */
  specDescription: string;
  /** YYYY-MM-DD of the most recent dated status entry. */
  lastStageChange: string;
  lastStageChangeFork: string | null;
  currentStage: string | null;
  url: string;
}

export interface EipStageChangesPayload {
  generatedAt: string;
  count: number;
  eips: EipStageChange[];
}

const getProposalPrefix = (eip: EIP): 'EIP' | 'RIP' =>
  eip.title.startsWith('RIP-') ? 'RIP' : 'EIP';

/**
 * Pure selection logic for the stage-change feed. Finds the most recent dated
 * status across all fork relationships, then reports the current stage from that
 * fork's latest status entry. Ordered newest first. Used by the Astro API
 * endpoint that emits the static JSON artifact.
 *
 * `count` is optional: unbounded by default, since the endpoint publishes the
 * whole chronology.
 */
export function getStageChanges(eips: EIP[], count?: number): EipStageChange[] {
  const eipsWithDates: Array<{
    eip: EIP;
    lastUpdate: Date;
    forkName: string | null;
    currentStage: string | null;
  }> = [];

  for (const eip of eips) {
    let mostRecentDate: Date | null = null;
    let mostRecentFork: string | null = null;

    for (const fork of eip.forkRelationships) {
      for (const entry of fork.statusHistory) {
        if (!entry.date) continue;
        const entryDate = new Date(entry.date);
        if (Number.isNaN(entryDate.getTime())) continue;
        if (!mostRecentDate || entryDate > mostRecentDate) {
          mostRecentDate = entryDate;
          mostRecentFork = fork.forkName;
        }
      }
    }

    if (!mostRecentDate) continue;

    const forkRel = eip.forkRelationships.find((f) => f.forkName === mostRecentFork);
    const currentStage = forkRel
      ? forkRel.statusHistory[forkRel.statusHistory.length - 1].status
      : null;

    eipsWithDates.push({ eip, lastUpdate: mostRecentDate, forkName: mostRecentFork, currentStage });
  }

  const ordered = eipsWithDates.sort(
    (a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime() || a.eip.id - b.eip.id,
  );

  return (count === undefined ? ordered : ordered.slice(0, count))
    .map(({ eip, lastUpdate, forkName, currentStage }) => ({
      id: eip.id,
      title: eip.title.replace(/^(EIP|RIP)-\d+:\s*/, ''),
      prefix: getProposalPrefix(eip),
      status: eip.status,
      description: eip.laymanDescription || eip.description,
      specDescription: eip.description,
      lastStageChange: lastUpdate.toISOString().split('T')[0],
      lastStageChangeFork: forkName,
      currentStage,
      url: `/eips/${eip.id}`,
    }));
}

export function buildEipStageChangesPayload(
  eips: EIP[],
  generatedAt: string,
  count?: number,
): EipStageChangesPayload {
  const changes = getStageChanges(eips, count);
  return { generatedAt, count: changes.length, eips: changes };
}

/** One fork's latest dated stage change for an EIP, as shown on the homepage. */
export interface StageTransition {
  eipId: number;
  /** `EIP-1234` or `RIP-1234`. */
  eipLabel: string;
  title: string;
  forkName: string;
  fromLabel: string | null;
  fromStage: InclusionStage | null;
  toLabel: string;
  toStage: InclusionStage;
  changeDate: string; // YYYY-MM-DD
}

/**
 * The `count` most recent per-fork stage transitions, newest first. Unlike
 * `getStageChanges` (one entry per EIP), an EIP that moved in two forks appears
 * twice. Each entry carries only what the homepage renders, so the page can take
 * it as a prop instead of bundling the whole EIP dataset.
 */
export function getRecentStageTransitions(eips: EIP[], count: number): StageTransition[] {
  const transitions: Array<{ transition: StageTransition; timestamp: number }> = [];

  for (const eip of eips) {
    for (const fork of eip.forkRelationships) {
      // Find the most recent dated status entry in this fork
      let latestIdx = -1;
      let latestTimestamp = -1;

      for (let i = 0; i < fork.statusHistory.length; i++) {
        const entry = fork.statusHistory[i];
        if (!entry.date) continue;
        const ts = Date.parse(entry.date);
        if (!Number.isFinite(ts)) continue;
        if (ts > latestTimestamp) {
          latestTimestamp = ts;
          latestIdx = i;
        }
      }

      if (latestIdx < 0) continue;

      const current = fork.statusHistory[latestIdx];
      const previous = latestIdx > 0 ? fork.statusHistory[latestIdx - 1] : null;
      const fromStage = previous ? getInclusionStageForStatus(previous.status) : null;
      const toStage = getInclusionStageForStatus(current.status);

      transitions.push({
        transition: {
          eipId: eip.id,
          eipLabel: `${getEipProposalPrefix(eip)}-${eip.id}`,
          title: getLaymanTitle(eip),
          forkName: fork.forkName,
          fromLabel: fromStage ? getStageAbbreviation(fromStage) : null,
          fromStage,
          toLabel: getStageAbbreviation(toStage),
          toStage,
          changeDate: current.date!,
        },
        timestamp: latestTimestamp,
      });
    }
  }

  // Sort by most recent first, then by EIP id for stability
  transitions.sort((a, b) => b.timestamp - a.timestamp || a.transition.eipId - b.transition.eipId);
  return transitions.slice(0, count).map((t) => t.transition);
}
