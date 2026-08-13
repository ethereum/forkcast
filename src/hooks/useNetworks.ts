import type {
  ActiveDevnetSeries,
  InactiveDevnetSeries,
  PublicNetworkSummary,
} from '../types/networks';
import { activeSeries, inactiveSeries, publicNetworks } from '../domain/networks/networks';

interface UseNetworksResult {
  publicNetworks: PublicNetworkSummary[];
  activeSeries: ActiveDevnetSeries[];
  inactiveSeries: InactiveDevnetSeries[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Thin island wrapper over the pure networks domain (src/domain/networks).
 * Data is derived once from the committed build-time snapshot, so it is available
 * synchronously on the first render — no loading state, no runtime fetch. The
 * loading/error/refetch fields are retained only for source-compatibility with the
 * components that still destructure them.
 */
export function useNetworks(): UseNetworksResult {
  return {
    publicNetworks,
    activeSeries,
    inactiveSeries,
    loading: false,
    error: null,
    refetch: () => {},
  };
}
