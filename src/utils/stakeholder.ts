import { EIP } from '../types/eip';
import { getInclusionStage } from './eip';

/**
 * Filter EIPs for a specific stakeholder and fork
 */
export const filterEipsForStakeholder = (
  eips: EIP[],
  forkName: string,
  stakeholderKey: keyof NonNullable<EIP['stakeholderImpacts']>
): EIP[] => {
  return eips.filter(eip => {
    const hasStakeholderImpact = eip.stakeholderImpacts?.[stakeholderKey]?.description;
    const hasForkRelationship = eip.forkRelationships.some(
      fr => fr.forkName.toLowerCase() === forkName.toLowerCase()
    );
    return hasStakeholderImpact && hasForkRelationship;
  });
};

/**
 * Group EIPs by inclusion stage for a specific fork
 */
export const groupByInclusionStage = (eips: EIP[], forkName: string) => ({
  sfi: eips.filter(eip => getInclusionStage(eip, forkName) === 'Scheduled for Inclusion'),
  cfi: eips.filter(eip => getInclusionStage(eip, forkName) === 'Considered for Inclusion'),
  pfi: eips.filter(eip => getInclusionStage(eip, forkName) === 'Proposed for Inclusion'),
  included: eips.filter(eip => getInclusionStage(eip, forkName) === 'Included'),
});
