import type { EIP } from '../../types/eip';

/**
 * One entry in the `/api/eip-stage-changes.json` artifact: an EIP that recently
 * changed inclusion stage, with the fork and stage that triggered the change.
 */
export interface EipStageChange {
  id: number;
  title: string;
  prefix: 'EIP' | 'RIP';
  status: string;
  description: string;
  /** YYYY-MM-DD of the most recent dated status entry. */
  lastStageChange: string;
  lastStageChangeFork: string | null;
  currentStage: string | null;
  url: string;
}

export interface EipStageChangesPayload {
  generatedAt: string;
  eips: EipStageChange[];
}

const getProposalPrefix = (eip: EIP): 'EIP' | 'RIP' =>
  eip.title.startsWith('RIP-') ? 'RIP' : 'EIP';

/**
 * Pure selection logic for the recent-stage-change feed. Finds the most recent
 * dated status across all fork relationships, then reports the current stage from
 * that fork's latest status entry. Shared by the Astro API endpoint that emits the
 * static JSON artifact.
 */
export function getRecentStageChanges(eips: EIP[], count = 10): EipStageChange[] {
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

  return eipsWithDates
    .sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime())
    .slice(0, count)
    .map(({ eip, lastUpdate, forkName, currentStage }) => ({
      id: eip.id,
      title: eip.title.replace(/^(EIP|RIP)-\d+:\s*/, ''),
      prefix: getProposalPrefix(eip),
      status: eip.status,
      description: eip.laymanDescription || eip.description,
      lastStageChange: lastUpdate.toISOString().split('T')[0],
      lastStageChangeFork: forkName,
      currentStage,
      url: `/eips/${eip.id}`,
    }));
}

export function buildEipStageChangesPayload(
  eips: EIP[],
  generatedAt: string,
  count = 10,
): EipStageChangesPayload {
  return { generatedAt, eips: getRecentStageChanges(eips, count) };
}
