import { useMemo } from 'react';
import { PrioritizationData, EipAggregateStance } from '../types/prioritization';
import { eipsData } from '../data/eips';
import { calculateEipAggregate } from '../utils/prioritization';

// Import the JSON data directly
import glamsterdamData from '../data/prioritization/glamsterdam.json';

interface UsePrioritizationDataResult {
  data: PrioritizationData;
  aggregates: EipAggregateStance[];
  lastUpdated: string;
}

/**
 * Hook to load and process prioritization data for a fork
 * Includes ALL EIPs related to the fork, not just those with stances
 */
export function usePrioritizationData(fork: string = 'glamsterdam'): UsePrioritizationDataResult {
  const data = useMemo(() => {
    // Currently only glamsterdam is supported
    if (fork.toLowerCase() === 'glamsterdam') {
      return glamsterdamData as PrioritizationData;
    }
    // Return empty data for unsupported forks
    return {
      fork,
      lastUpdated: new Date().toISOString().split('T')[0],
      eips: [],
    };
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
  };
}

/**
 * Get a list of all EL client names
 */
export function getELClients(): string[] {
  return ['Besu', 'Erigon', 'Geth', 'Nethermind', 'Reth'];
}

/**
 * Get a list of all CL client names
 */
export function getCLClients(): string[] {
  return ['Grandine', 'Lighthouse', 'Lodestar', 'Nimbus', 'Prysm', 'Teku'];
}

/**
 * Get all client names
 */
export function getAllClients(): string[] {
  return [...getELClients(), ...getCLClients()];
}
