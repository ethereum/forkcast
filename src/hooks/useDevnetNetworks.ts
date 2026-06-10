import type { ActiveDevnetSeries, InactiveDevnetSeries } from '../types/devnet-networks';
import { activeSeries, inactiveSeries } from '../domain/devnets/networks';

interface UseDevnetNetworksResult {
  activeSeries: ActiveDevnetSeries[];
  inactiveSeries: InactiveDevnetSeries[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Thin island wrapper over the pure devnet-networks domain (src/domain/devnets).
 * Data is derived once from the committed build-time snapshot, so it is available
 * synchronously on the first render — no loading state, no runtime fetch. The
 * loading/error/refetch fields are retained only for source-compatibility with the
 * components that still destructure them.
 */
export function useDevnetNetworks(): UseDevnetNetworksResult {
  return {
    activeSeries,
    inactiveSeries,
    loading: false,
    error: null,
    refetch: () => {},
  };
}
