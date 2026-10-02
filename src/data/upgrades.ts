import { ClientTeamPerspective } from '../types/eip';
import type { MacroPhase } from '../types/timeline';

export interface ActivationDetails {
  blockNumber: number;
  epochNumber: number;
  slotNumber: number;
}

/**
 * The upgrade's mascot, per the EIP-8066 process. `name` is the animal, which
 * is not always the emoji's own — Dencun's blobfish has no emoji of its own.
 *
 * The forks predating EIP-8066 were picked informally. The panda and the owl
 * come from the naming-schemes thread that started the convention:
 * https://ethereum-magicians.org/t/rfc-post-merge-network-upgrade-naming-schemes/11977
 */
export interface UpgradeMascot {
  emoji: string;
  name: string;
  /** Where the animal came from, when it isn't self-evident. */
  note?: string;
  /** What `note` is drawn from. The mascot links here instead of to EIP-8066. */
  source?: { url: string; label: string };
}

export interface NetworkUpgrade {
  id: string;
  path: string;
  name: string;
  description: string;
  tagline: string;
  status: 'Live' | 'Upcoming' | 'Planning' | 'Research';
  activationDate?: string;
  /**
   * Working estimate of mainnet activation, as 'YYYY-MM-DD'. A planning
   * assumption, never an announced date — `/schedule` seeds its sandbox from it
   * and `/cadence` plots it, so it lives here rather than in either page to stop
   * the two drifting apart.
   */
  projectedActivation?: string;
  disabled: boolean;
  metaEipLink?: string;
  clientTeamPerspectives?: ClientTeamPerspective[];
  activationDetails?: ActivationDetails;
  macroPhaseOverride?: MacroPhase;
  highlights?: string;
  externalLink?: string;
  hideProgressBar?: boolean;
  mascot?: UpgradeMascot;
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
    externalLink: 'https://ethereum.org/roadmap/merge/',
    mascot: { emoji: '🐼', name: 'Panda', note: 'From the fusion-dance meme: a black bear (execution) and a white bear (consensus) merging into one.' }
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
    externalLink: 'https://eips.ethereum.org/EIPS/eip-7568',
    mascot: { emoji: '🦉', name: 'Owl', note: 'A pun on the headline feature: withdrawals → withdrOWLs.' }
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
    externalLink: 'https://eips.ethereum.org/EIPS/eip-7569',
    mascot: { emoji: '🐡', name: 'Blobfish', note: 'For the blobs. Unicode has no blobfish, so the blowfish stands in.' }
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
    },
    mascot: { emoji: '🦒', name: 'Giraffe', note: 'Adopted at the Nyota interop week in Kenya.', source: { url: 'https://blog.ethereum.org/2024/05/22/nyota-interop-recap', label: 'Interop recap' } }
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
    activationDetails: {
      blockNumber: 23935694,
      epochNumber: 411392,
      slotNumber: 13164544
    },
    mascot: { emoji: '🦓', name: 'Zebra', note: "Stripes for PeerDAS's data columns." }
  },
  {
    id: 'glamsterdam',
    path: '/upgrade/glamsterdam',
    name: 'Glamsterdam Upgrade',
    description: 'Major network upgrade featuring Block-level Access Lists and ePBS. Named after the combination of "Amsterdam" (execution layer upgrade, named after the previous Devconnect location) and "Gloas" (consensus layer upgrade, named after a star).',
    tagline: 'Devnet series complete, now testing on public testnets',
    status: 'Upcoming',
    activationDate: '2026',
    projectedActivation: '2026-12-02',
    disabled: false,
    metaEipLink: 'https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195',
    // The only mascot written into a hardfork meta EIP so far: EIP-7773#mascot.
    mascot: { emoji: '🐻‍❄️', name: 'Polar bear', note: 'From the Soldøgn interop, held in Longyearbyen, Svalbard, above the Arctic Circle.', source: { url: 'https://blog.ethereum.org/2026/05/02/soldogn-interop-recap', label: 'Interop recap' } },
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
    tagline: 'Headliner selection concluded: FOCIL and Frame Tx SFI\'d as headliners',
    status: 'Planning',
    activationDate: '2027',
    projectedActivation: '2027-06-16',
    disabled: false,
    macroPhaseOverride: 'scoping',
    metaEipLink: 'https://ethereum-magicians.org/t/eip-8081-hegota-network-upgrade-meta-thread/26876'
  }
];

export const getUpgradeById = (id: string): NetworkUpgrade | undefined => {
  return networkUpgrades.find(upgrade => upgrade.id === id);
};

// Forks that have a public `/upgrade/{id}` page. Historical forks (e.g. Dencun,
// Shapella) have no page, so link sites should render them as plain text rather
// than linking to a route the static build doesn't emit (which would 404).
const FORKS_WITH_PUBLIC_PAGE = new Set(['pectra', 'fusaka', 'hegota', 'glamsterdam']);

// Client-facing data (cartographoor fork schedules, client release notes) names
// forks per layer. Forkcast talks in combined upgrade names, so each layer fork
// maps to the upgrade it belongs to.
const FORK_NAME_ALIASES: Record<string, string> = {
  bellatrix: 'the-merge',
  paris: 'the-merge',
  capella: 'shapella',
  shanghai: 'shapella',
  deneb: 'dencun',
  cancun: 'dencun',
  electra: 'pectra',
  prague: 'pectra',
  fulu: 'fusaka',
  osaka: 'fusaka',
  gloas: 'glamsterdam',
  amsterdam: 'glamsterdam',
  heze: 'hegota',
  bogota: 'hegota',
};

const COMBINED_UPGRADE_IDS = new Set(Object.values(FORK_NAME_ALIASES));

/**
 * The combined upgrade a layer fork belongs to ("fulu" -> "fusaka"), or null when
 * the fork predates combined naming ("altair", "london").
 */
export const getCombinedUpgradeName = (forkName: string): string | null => {
  const id = forkName.toLowerCase();
  if (COMBINED_UPGRADE_IDS.has(id)) return id;
  return FORK_NAME_ALIASES[id] ?? null;
};

/** Returns the `/upgrade/{id}` path for a fork, or null when it has no public page. */
export const getUpgradePagePath = (forkName: string): string | null => {
  const id = getCombinedUpgradeName(forkName) ?? forkName.toLowerCase();
  return FORKS_WITH_PUBLIC_PAGE.has(id) ? `/upgrade/${id}` : null;
};