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
  /** Public block explorer (etherscan) — public networks only. */
  explorer?: string;
  /** Public beacon chain explorer (beaconcha.in) — public networks only. */
  beaconExplorer?: string;
}

/** A single fork activation, as reported per layer by cartographoor. */
export interface ForkActivation {
  /** Consensus-layer activation epoch. */
  epoch?: number;
  /** Execution-layer activation block. */
  block?: number;
  timestamp: number;
  minClientVersions?: Record<string, string>;
}

export interface NetworkForks {
  consensus?: Record<string, ForkActivation>;
  execution?: Record<string, ForkActivation>;
}

/** One step of the blob parameter ramp (BPO). */
export interface BlobScheduleEntry {
  epoch: number;
  timestamp: number;
  maxBlobsPerBlock: number;
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
  lastUpdated?: string;
  chainId?: number;
  description?: string;
  serviceUrls?: NetworkServiceUrls;
  genesisConfig?: GenesisConfig;
  forks?: NetworkForks;
  blobSchedule?: BlobScheduleEntry[];
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
  /** Highest version number ever seen for this category (active or inactive), or null. */
  highestKnownVersion: number | null;
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

/**
 * An active cartographoor network that isn't part of any devnet series —
 * mainnet, sepolia, hoodi, and any future public testnet. Shaped for the index
 * cards; the detail page reads the full `NetworkEntry`.
 */
export interface PublicNetworkSummary {
  key: string;
  displayName: string;
  description: string;
  chainId: number | null;
  genesisTime: number | null;
  /** Most recent activated fork name, or null if none have activated. */
  latestFork: string | null;
  /** Next scheduled fork name, or null when nothing is upcoming. */
  nextFork: string | null;
  /**
   * Non-null when this entry is a devnet promoted to public-testnet status; `key`
   * is then the devnet id and `/networks/{key}` is its devnet spec page.
   */
  promotedLabel: string | null;
}
