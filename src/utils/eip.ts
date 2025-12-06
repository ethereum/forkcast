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
    default:
      return 'Unknown';
  }
};

/**
 * Get the headliner discussion link for an EIP in a specific fork
 */
export const getHeadlinerDiscussionLink = (eip: EIP, forkName?: string): string | null => {
  if (!forkName) return null;

  const forkRelationship = eip.forkRelationships.find(fork =>
    fork.forkName.toLowerCase() === forkName.toLowerCase()
  );
  return forkRelationship?.headlinerDiscussionLink || null;
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
 * Get the layer (EL/CL) for a headliner EIP in a specific fork
 */
export const getHeadlinerLayer = (eip: EIP, forkName?: string): string | null => {
  if (!forkName) return null;

  const forkRelationship = eip.forkRelationships.find(fork =>
    fork.forkName.toLowerCase() === forkName.toLowerCase()
  );
  return forkRelationship?.layer || null;
};

/**
 * Get the layer (EL/CL) for any EIP in a specific fork
 */
export const getEipLayer = (eip: EIP, forkName?: string): 'EL' | 'CL' | null => {
  if (!forkName) return null;

  const forkRelationship = eip.forkRelationships.find(fork =>
    fork.forkName.toLowerCase() === forkName.toLowerCase()
  );
  return forkRelationship?.layer as 'EL' | 'CL' | null || null;
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
 * Get the fork relationship for an EIP in a specific fork
 */
export const getForkRelationship = (eip: EIP, forkName?: string): ForkRelationship | undefined => {
  if (!forkName) return undefined;

  return eip.forkRelationships.find(fork =>
    fork.forkName.toLowerCase() === forkName.toLowerCase()
  );
};