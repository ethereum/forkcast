import { useMemo } from 'react';
import { PrioritizationData, EipAggregateStance, TeamEntry } from '../types/prioritization';
import { eipsData } from '../data/eips';
import { calculateEipAggregate } from '../utils/prioritization';
import { formatISODate } from '../utils/date';

// Import the JSON data directly
import glamsterdamData from '../data/prioritization/glamsterdam.json';
import hegotaData from '../data/prioritization/hegota.json';

interface UsePrioritizationDataResult {
  data: PrioritizationData;
  aggregates: EipAggregateStance[];
  lastUpdated: string;
  /** Fork's roster split by team type, so the table has columns before any stance exists. */
  elTeams: TeamEntry[];
  clTeams: TeamEntry[];
  otherTeams: TeamEntry[];
}

const FORK_DATA: Record<string, PrioritizationData> = {
  glamsterdam: glamsterdamData as PrioritizationData,
  hegota: hegotaData as PrioritizationData,
};

/**
 * Hook to load and process prioritization data for a fork
 * Includes ALL EIPs related to the fork, not just those with stances
 */
export function usePrioritizationData(fork: string = 'glamsterdam'): UsePrioritizationDataResult {
  const data = useMemo(() => {
    return (
      FORK_DATA[fork.toLowerCase()] ?? {
        fork,
        lastUpdated: formatISODate(new Date()),
        teams: [],
        eips: [],
      }
    );
  }, [fork]);

  const aggregates = useMemo(() => {
    // Get ALL EIPs that have a relationship with this fork
    const forkEips = eipsData.filter((eip) =>
      eip.forkRelationships.some(
        (rel) => rel.forkName.toLowerCase() === fork.toLowerCase()
      )
    );

    // Create a map of EIP ID to stances from the prioritization data
    const stancesMap = new Map(
      data.eips.map((eipPrio) => [eipPrio.eipId, eipPrio.stances])
    );

    // Build aggregates for ALL fork EIPs, using empty stances array if no data
    return forkEips.map((eip) => {
      const stances = stancesMap.get(eip.id) || [];
      return calculateEipAggregate(eip.id, stances, eip, fork);
    });
  }, [data, fork]);

  return {
    data,
    aggregates,
    lastUpdated: data.lastUpdated,
    elTeams: data.teams.filter((t) => t.type === 'EL'),
    clTeams: data.teams.filter((t) => t.type === 'CL'),
    otherTeams: data.teams.filter((t) => t.type === 'OTHER'),
  };
}
