import { EIP, ForkRelationship, InclusionStage, ProposalType } from '../types/eip';

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

  switch (status) {
    case 'Proposed':
      return 'Proposed for Inclusion';
    case 'Considered':
      return 'Considered for Inclusion';
    case 'Scheduled':
      return 'Scheduled for Inclusion';
    case 'Declined':
      return 'Declined for Inclusion';
    case 'Included':
      return 'Included';
    case 'Withdrawn':
      return 'Withdrawn';
    default:
      return 'Unknown';
  }
};

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
 * Get the layer (EL/CL) for a headliner EIP
 */
export const getHeadlinerLayer = (eip: EIP): string | null => {
  return eip.layer || null;
};

/**
 * Get the layer (EL/CL) for any EIP
 */
export const getEipLayer = (eip: EIP): 'EL' | 'CL' | null => {
  return eip.layer || null;
};

/**
 * Get the layer for an EIP
 */
export const getPrimaryEipLayer = (eip: EIP): 'EL' | 'CL' | null => {
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

/**
 * Get the specification URL for an EIP
 */
export const getSpecificationUrl = (eip: EIP): string => {
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
  return forkRelationship?.wasHeadlinerCandidate || false;
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
  return eip.forkRelationships.some(fork => fork.wasHeadlinerCandidate === true);
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