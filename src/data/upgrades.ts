import { ClientTeamPerspective, HeadlinerSelection } from '../types/eip';
import type { MacroPhase } from '../types/timeline';

export interface ActivationDetails {
  blockNumber: number;
  epochNumber: number;
  slotNumber: number;
}

export interface NetworkUpgrade {
  id: string;
  path: string;
  name: string;
  description: string;
  tagline: string;
  status: 'Live' | 'Upcoming' | 'Planning' | 'Research';
  activationDate?: string;
  disabled: boolean;
  metaEipLink?: string;
  clientTeamPerspectives?: ClientTeamPerspective[];
  activationDetails?: ActivationDetails;
  macroPhaseOverride?: MacroPhase;
  highlights?: string;
  externalLink?: string;
  hideProgressBar?: boolean;
  headlinerSelection?: HeadlinerSelection;
}

export const networkUpgrades: NetworkUpgrade[] = [
  {
    id: 'previous-upgrades',
    path: '/upgrade/previous-upgrades',
    name: 'Previous Upgrades',
    description: 'A complete history of all Ethereum network upgrades from the early days to the present.',
    tagline: 'Explore the full history of Ethereum network upgrades.',
    status: 'Live',
    disabled: true,
    externalLink: 'https://ethereum.org/history',
    hideProgressBar: true
  },
  {
    id: 'the-merge',
    path: '/upgrade/the-merge',
    name: 'The Merge',
    description: 'Transition to Proof of Stake, replacing energy-intensive proof-of-work mining with a more sustainable consensus mechanism.',
    tagline: 'Transition to Proof of Stake.',
    status: 'Live',
    activationDate: 'Sep 15, 2022',
    disabled: true,
    externalLink: 'https://ethereum.org/roadmap/merge/'
  },
  {
    id: 'shapella',
    path: '/upgrade/shapella',
    name: 'Shapella Upgrade',
    description: 'Major upgrade enabling staking withdrawals, allowing validators to withdraw their staked ETH for the first time since the Beacon Chain launch. Named after the combination of "Shanghai" (execution layer upgrade, named after Devcon II location) and "Capella" (consensus layer upgrade, named after a star).',
    tagline: 'Enabling staking withdrawals and completing the transition to proof-of-stake.',
    status: 'Live',
    activationDate: 'Apr 12, 2023',
    disabled: true,
    highlights: 'Staking withdrawals (EIP-4895)',
    externalLink: 'https://eips.ethereum.org/EIPS/eip-7568'
  },
  {
    id: 'dencun',
    path: '/upgrade/dencun',
    name: 'Dencun Upgrade',
    description: 'Major upgrade introducing proto-danksharding (EIP-4844) for Layer 2 scaling via blob transactions. Named after the combination of "Deneb" (consensus layer upgrade, named after a star) and "Cancun" (execution layer upgrade, named after Devcon III location).',
    tagline: 'Proto-danksharding brings cheaper Layer 2 transactions through blob data.',
    status: 'Live',
    activationDate: 'Mar 13, 2024',
    disabled: true,
    highlights: 'Proto-danksharding / blobs (EIP-4844)',
    externalLink: 'https://eips.ethereum.org/EIPS/eip-7569'
  },
  {
    id: 'pectra',
    path: '/upgrade/pectra',
    name: 'Pectra Upgrade',
    description: 'Major upgrade introducing account abstraction (enabling smart contract functionality for regular accounts), validator experience improvements (higher balance limits, faster deposits, better exit controls), and blob scaling (doubled throughput for Layer 2 data). Named after the combination of "Prague" (execution layer upgrade, named after Devcon IV location) and "Electra" (consensus layer upgrade, named after a star in Taurus).',
    tagline: 'Account abstraction, validator upgrades, and 2x blob throughput - making Ethereum faster and cheaper.',
    status: 'Live',
    activationDate: 'May 7, 2025',
    disabled: false,
    highlights: 'Account abstraction (EIP-7702), staker upgrades, blob scaling',
    metaEipLink: 'https://ethereum-magicians.org/t/pectra-network-upgrade-meta-thread/16809',
    activationDetails: {
      blockNumber: 22431084,
      epochNumber: 364032,
      slotNumber: 11649024
    }
  },
  {
    id: 'fusaka',
    path: '/upgrade/fusaka',
    name: 'Fusaka Upgrade',
    description: 'Major improvements to Ethereum\'s scalability and user experience, including PeerDAS for enhanced data availability. Named after the combination of "Fulu" (consensus layer upgrade, named after a star) and "Osaka" (execution layer upgrade, named after a Devcon location).',
    tagline: 'PeerDAS enables nodes to specialize in storing data subsets, increasing capacity for Layer 2 networks.',
    status: 'Live',
    activationDate: 'Dec 3, 2025',
    disabled: false,
    highlights: 'PeerDAS (EIP-7594), gas limit increase, introduce BPOs',
    headlinerSelection: {
      status: 'finalized',
      selected: {
        CL: 7594
      }
    },
    activationDetails: {
      blockNumber: 23935694,
      epochNumber: 411392,
      slotNumber: 13164544
    }
  },
  {
    id: 'glamsterdam',
    path: '/upgrade/glamsterdam',
    name: 'Glamsterdam Upgrade',
    description: 'Major network upgrade featuring Block-level Access Lists and ePBS. Named after the combination of "Amsterdam" (execution layer upgrade, named after the previous Devconnect location) and "Gloas" (consensus layer upgrade, named after a star).',
    tagline: 'Scoping complete, implemented EIPs are being tested on devnets',
    status: 'Upcoming',
    activationDate: '2026',
    disabled: false,
    metaEipLink: 'https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195',
    headlinerSelection: {
      status: 'finalized',
      selected: {
        EL: 7928,
        CL: 7732
      }
    },
    clientTeamPerspectives: [
      {
        teamName: 'Besu',
        teamType: 'EL',
        headlinerBlogPostUrl: 'https://hackmd.io/@RoboCopsGoneMad/Ski-5cHLge',
        candidateBlogPostUrl: 'https://hackmd.io/@RoboCopsGoneMad/GlamTiers'
      },
      {
        teamName: 'Erigon',
        teamType: 'EL',
        headlinerBlogPostUrl: 'https://hackmd.io/@erigon/Glamsterdam_Headliners_View',
        candidateBlogPostUrl: 'https://github.com/erigontech/erigon/wiki/Glamsterdam-PFI-stand'
      },
      {
        teamName: 'Geth',
        teamType: 'EL',
        headlinerBlogPostUrl: 'https://github.com/ethereum/pm/issues/1610#issuecomment-3073521193',
        candidateBlogPostUrl: 'https://notes.ethereum.org/@fjl/geth-glamsterdam-eip-ranking'
      },
      {
        teamName: 'Grandine',
        teamType: 'CL',
        headlinerBlogPostUrl: 'https://github.com/ethereum/pm/issues/1610#issuecomment-3078680887',
        candidateBlogPostUrl: 'https://github.com/ethereum/pm/issues/1790#issuecomment-3528064777'
      },
      {
        teamName: 'Lighthouse',
        teamType: 'CL',
        headlinerBlogPostUrl: 'https://blog.sigmaprime.io/glamsterdam-headliner.html',
        candidateBlogPostUrl: 'https://blog.sigmaprime.io/glamsterdam-eip-preferences.html'
      },
      {
        teamName: 'Lodestar',
        teamType: 'CL',
        headlinerBlogPostUrl: 'https://blog.chainsafe.io/lodestars-glamsterdam-headliner-vision/',
        candidateBlogPostUrl: 'https://blog.chainsafe.io/lodestar-glamsterdam-upgrade-proposal/'
      },
      {
        teamName: 'Nethermind',
        teamType: 'EL',
        headlinerBlogPostUrl: 'https://hackmd.io/@nethermindclient/Syqj3VUUxg',
        candidateBlogPostUrl: 'https://x.com/URozmej/status/1986040895578296825'
      },
      {
        teamName: 'Nimbus',
        teamType: 'CL',
        headlinerBlogPostUrl: 'https://notes.status.im/MJFCsbS0RTaDZYMMapR1ng?view',
        candidateBlogPostUrl: 'https://notes.status.im/s/6-ZIuquGe'
      },
      {
        teamName: 'Prysm',
        teamType: 'CL',
        headlinerBlogPostUrl: 'https://hackmd.io/@tchain/prysm-glamsterdam-headliner',
        candidateBlogPostUrl: 'https://github.com/ethereum/pm/issues/1790#issuecomment-3524246616'
      },
      {
        teamName: 'Reth',
        teamType: 'EL',
        headlinerBlogPostUrl: 'https://hackmd.io/@ZPrq5kalQqSX-138YNSJUQ/H1JafRXLle',
        candidateBlogPostUrl: 'https://hackmd.io/@jenpaff/S1bj9gqkbe'
      },
      {
        teamName: 'Teku',
        teamType: 'CL',
        headlinerBlogPostUrl: 'https://hackmd.io/@teku/SJeW2JULlx',
        candidateBlogPostUrl: 'https://hackmd.io/KUFN0UIMRgCLheMVzFmN5A'
      }
    ]
  },
  {
    id: 'hegota',
    path: '/upgrade/hegota',
    name: 'Hegotá Upgrade',
    description: 'Future network upgrade currently in early planning stages. Named after the combination of "Heze" (consensus layer upgrade, named after a star) and "Bogotá" (execution layer upgrade, named after a Devcon location).',
    tagline: 'Headliner selection concluded: FOCIL SFI\'d, Frame Tx CFI\'d',
    status: 'Planning',
    activationDate: '2027',
    disabled: false,
    macroPhaseOverride: 'scoping',
    metaEipLink: 'https://ethereum-magicians.org/t/eip-8081-hegota-network-upgrade-meta-thread/26876',
    headlinerSelection: {
      status: 'finalized',
      selected: {
        CL: 7805
      }
    }
  }
];

export const getUpgradeById = (id: string): NetworkUpgrade | undefined => {
  return networkUpgrades.find(upgrade => upgrade.id === id);
};

// Forks that have a public `/upgrade/{id}` page. Historical forks (e.g. Dencun,
// Shapella) have no page, so link sites should render them as plain text rather
// than linking to a route the static build doesn't emit (which would 404).
const FORKS_WITH_PUBLIC_PAGE = new Set(['pectra', 'fusaka', 'hegota', 'glamsterdam']);

/** Returns the `/upgrade/{id}` path for a fork, or null when it has no public page. */
export const getUpgradePagePath = (forkName: string): string | null => {
  const id = forkName.toLowerCase();
  return FORKS_WITH_PUBLIC_PAGE.has(id) ? `/upgrade/${id}` : null;
};
