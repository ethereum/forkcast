import { EIP, ForkRelationship, InclusionStage, ProposalType } from '../types/eip';

type ForkStatus = ForkRelationship['statusHistory'][number]['status'];

const INCLUSION_STAGE_BY_STATUS: Record<ForkStatus, InclusionStage> = {
  Proposed: 'Proposed for Inclusion',
  Considered: 'Considered for Inclusion',
  Scheduled: 'Scheduled for Inclusion',
  Declined: 'Declined for Inclusion',
  Included: 'Included',
  Withdrawn: 'Withdrawn',
};

const INCLUSION_STAGE_LABELS: Record<InclusionStage, string> = {
  'Included': 'Included',
  'Scheduled for Inclusion': 'SFI',
  'Considered for Inclusion': 'CFI',
  'Proposed for Inclusion': 'PFI',
  'Declined for Inclusion': 'DFI',
  'Withdrawn': 'Withdrawn',
  'Unknown': 'Unknown',
};

const INCLUSION_STAGE_ORDER: InclusionStage[] = [
  'Included',
  'Scheduled for Inclusion',
  'Considered for Inclusion',
  'Proposed for Inclusion',
  'Declined for Inclusion',
  'Withdrawn',
  'Unknown',
];

const inclusionStageRanks = new Map(
  INCLUSION_STAGE_ORDER.map((stage, index) => [stage, index + 1])
);

function isInclusionStage(stage: string): stage is InclusionStage {
  return inclusionStageRanks.has(stage as InclusionStage);
}

/**
 * Get the inclusion stage for an EIP in a specific fork
 */
export const getInclusionStage = (eip: EIP, forkName?: string): InclusionStage => {
  if (!forkName) return 'Unknown';

  const forkRelationship = eip.forkRelationships.find(fork =>
    fork.forkName.toLowerCase() === forkName.toLowerCase()
  );

  if (!forkRelationship || !forkRelationship.statusHistory.length) return 'Unknown';

  const status = forkRelationship.statusHistory[forkRelationship.statusHistory.length - 1].status;

  return INCLUSION_STAGE_BY_STATUS[status] ?? 'Unknown';
};

/**
 * Get the compact display label for an inclusion stage.
 */
export const getStageAbbreviation = (stage: string): string =>
  isInclusionStage(stage) ? INCLUSION_STAGE_LABELS[stage] : stage;

export const getInclusionStageSortRank = (stage: string): number =>
  isInclusionStage(stage) ? inclusionStageRanks.get(stage)! : 99;

/**
 * Get the headliner discussion link for an EIP in a specific fork
 * Looks for a headliner_proposal entry in presentationHistory
 */
export const getHeadlinerDiscussionLink = (eip: EIP, forkName?: string): string | null => {
  if (!forkName) return null;

  const forkRelationship = eip.forkRelationships.find(fork =>
    fork.forkName.toLowerCase() === forkName.toLowerCase()
  );

  if (!forkRelationship?.presentationHistory) return null;

  const headlinerProposal = forkRelationship.presentationHistory.find(
    p => p.type === 'headliner_proposal'
  );

  return headlinerProposal?.link || null;
};

/**
 * Check if an EIP is a headliner for a specific fork
 */
export const isHeadliner = (eip: EIP, forkName?: string): boolean => {
  if (!forkName) return false;

  const forkRelationship = eip.forkRelationships.find(fork =>
    fork.forkName.toLowerCase() === forkName.toLowerCase()
  );
  return forkRelationship?.isHeadliner || false;
};

/**
 * Get the layer (EL/CL) for an EIP
 */
export const getEipLayer = (eip: EIP): 'EL' | 'CL' | null => {
  return eip.layer || null;
};

/**
 * Get the layman title (remove EIP/RIP prefix)
 */
export const getLaymanTitle = (eip: EIP): string => {
  return eip.title.replace(/^(EIP|RIP)-\d+:\s*/, '');
};

/**
 * Get the proposal prefix (EIP or RIP)
 */
export const getProposalPrefix = (eip: EIP): ProposalType => {
  if (eip.title.startsWith('RIP-')) {
    return 'RIP';
  }
  return 'EIP';
};

export const getSummaryDescription = (eip: EIP): string =>
  eip.description;

/**
 * Get the specification URL for an EIP
 */
export const getSpecificationUrl = (eip: EIP): string => {
  if (eip.specificationUrl) {
    return eip.specificationUrl;
  }
  if (eip.title.startsWith('RIP-')) {
    return `https://github.com/ethereum/RIPs/blob/master/RIPS/rip-${eip.id}.md`;
  }
  return `https://eips.ethereum.org/EIPS/eip-${eip.id}`;
};

/**
 * Check if an EIP was a headliner candidate for a specific fork
 */
export const wasHeadlinerCandidate = (eip: EIP, forkName?: string): boolean => {
  if (!forkName) return false;

  const forkRelationship = eip.forkRelationships.find(fork =>
    fork.forkName.toLowerCase() === forkName.toLowerCase()
  );
  if (!forkRelationship?.wasHeadlinerCandidate) return false;

  // Exclude withdrawn proposals
  const latestStatus = forkRelationship.statusHistory[forkRelationship.statusHistory.length - 1]?.status;
  if (latestStatus === 'Withdrawn') return false;

  return true;
};

/**
 * Check if an EIP was a headliner candidate but was NOT selected
 * (i.e., it should appear in the Headliner Proposals section, not in regular stages)
 */
export const isUnselectedHeadlinerCandidate = (eip: EIP, forkName?: string): boolean => {
  if (!forkName) return false;
  return wasHeadlinerCandidate(eip, forkName) && !isHeadliner(eip, forkName);
};

/**
 * Sort comparator for ordering by layer (EL first, then CL)
 */
export const sortByLayer = <T extends { layer?: 'EL' | 'CL' | string | null }>(a: T, b: T): number => {
  const layerA = a.layer;
  const layerB = b.layer;
  if (layerA === 'EL' && layerB === 'CL') return -1;
  if (layerA === 'CL' && layerB === 'EL') return 1;
  return 0;
};

/**
 * Check if an EIP is a selected headliner in ANY fork
 */
export const isHeadlinerInAnyFork = (eip: EIP): boolean => {
  return eip.forkRelationships.some(fork => fork.isHeadliner === true);
};

/**
 * Check if an EIP was a headliner candidate in ANY fork (but not selected in any)
 */
export const wasHeadlinerCandidateInAnyFork = (eip: EIP): boolean => {
  // If selected in any fork, this returns false
  if (isHeadlinerInAnyFork(eip)) return false;
  return eip.forkRelationships.some(fork => {
    if (!fork.wasHeadlinerCandidate) return false;
    const latestStatus = fork.statusHistory[fork.statusHistory.length - 1]?.status;
    return latestStatus !== 'Withdrawn';
  });
};

/**
 * Get the fork relationship for an EIP in a specific fork
 */
export const getForkRelationship = (eip: EIP, forkName?: string): ForkRelationship | undefined => {
  if (!forkName) return undefined;

  return eip.forkRelationships.find(fork =>
    fork.forkName.toLowerCase() === forkName.toLowerCase()
  );
};

/**
 * Parsed author information
 */
export interface ParsedAuthor {
  name: string;
  handle?: string; // GitHub username or email
}

/**
 * Parse author string into structured data
 * Handles formats like:
 * - "Vitalik Buterin"
 * - "Alex Beregszaszi (@axic)"
 * - "Vitalik Buterin <vitalik@ethereum.org>"
 * - "Alex Beregszaszi (@axic), Paweł Bylica (@chfast)"
 */
export const parseAuthors = (authorString: string): ParsedAuthor[] => {
  if (!authorString) return [];

  // Split by comma, but be careful with commas inside parentheses or angle brackets
  const authors: ParsedAuthor[] = [];

  // Simple split by comma - works for most cases
  const parts = authorString.split(/,\s*/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check for GitHub handle pattern: Name (@handle)
    const githubMatch = trimmed.match(/^(.+?)\s*\(@([^)]+)\)$/);
    if (githubMatch) {
      authors.push({
        name: githubMatch[1].trim(),
        handle: `@${githubMatch[2]}`,
      });
      continue;
    }

    // Check for email pattern: Name <email>
    const emailMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
    if (emailMatch) {
      authors.push({
        name: emailMatch[1].trim(),
        handle: emailMatch[2],
      });
      continue;
    }

    // Just a name
    authors.push({ name: trimmed });
  }

  return authors;
};
