/**
 * Public testnets that have been shut down. Cartographoor drops a network from
 * networks.json entirely once it is retired — unlike a devnet series, which stays
 * behind as an `inactive` entry — so there is nothing to derive these from and the
 * list is curated. They render as dimmed index cards with no detail page.
 */
export interface RetiredPublicNetwork {
  key: string;
  displayName: string;
  description: string;
  chainId: number;
  /** When the network was shut down, as displayed. */
  retired: string;
}

export const RETIRED_PUBLIC_NETWORKS: RetiredPublicNetwork[] = [
  {
    key: 'holesky',
    displayName: 'Holešky',
    description: 'Staking and validator testnet, succeeded by Hoodi.',
    chainId: 17000,
    retired: 'September 2025',
  },
  {
    key: 'goerli',
    displayName: 'Goerli',
    description:
      'Cross-client proof-of-authority testnet, later merged to proof-of-stake. Succeeded by Sepolia and Holešky.',
    chainId: 5,
    retired: 'April 2024',
  },
];
