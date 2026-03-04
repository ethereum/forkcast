/** Types for the ethPandaOps networks.json endpoint */

export interface NetworkMetadataLink {
  title: string;
  url: string;
}

export interface NetworkMetadataStats {
  totalNetworks: number;
  activeNetworks: number;
  inactiveNetworks: number;
  networkNames: string[];
}

export interface NetworkMetadataEntry {
  displayName: string;
  description: string;
  links: NetworkMetadataLink[] | null;
  image: string;
  stats: NetworkMetadataStats;
}

export interface NetworkServiceUrls {
  faucet?: string;
  jsonRpc?: string;
  beaconRpc?: string;
  forkmon?: string;
  assertoor?: string;
  dora?: string;
  checkpointSync?: string;
  devnetSpec?: string;
  tracoor?: string;
  syncoor?: string;
}

export interface GenesisConfigFile {
  path: string;
  url: string;
}

export interface GenesisConfig {
  consensusLayer?: GenesisConfigFile[];
  executionLayer?: GenesisConfigFile[];
  metadata?: GenesisConfigFile[];
  api?: GenesisConfigFile[];
  genesisTime?: number;
  genesisDelay?: number;
}

export interface NetworkEntry {
  name: string;
  repository: string;
  path: string;
  url: string;
  status: 'active' | 'inactive' | 'unknown';
  lastUpdated: string;
  chainId?: number;
  serviceUrls?: NetworkServiceUrls;
  genesisConfig?: GenesisConfig;
}

export interface NetworksJsonResponse {
  networkMetadata: Record<string, NetworkMetadataEntry>;
  networks: Record<string, NetworkEntry>;
}

/** A category with no active networks. */
export interface InactiveDevnetSeries {
  categoryKey: string;
  displayName: string;
  description: string;
}

/** Processed type used by components */
export interface ActiveDevnetSeries {
  categoryKey: string;
  displayName: string;
  description: string;
  links: NetworkMetadataLink[] | null;
  /** All active network keys for this category, sorted by version descending. */
  activeKeys: string[];
  /** Version number of the latest active devnet, or null if none active. */
  latestActiveVersion: number | null;
  serviceUrls: NetworkServiceUrls | null;
}
