import { ClientTeamPerspective } from '../types/eip';

export interface NetworkUpgrade {
  id: string;
  path: string;
  name: string;
  description: string;
  tagline: string;
  status: 'Live' | 'Upcoming' | 'Planning' | 'Research';
  activationDate: string;
  disabled: boolean;
  metaEipLink?: string;
  clientTeamPerspectives?: ClientTeamPerspective[];
}

export const networkUpgrades: NetworkUpgrade[] = [
  {
    id: 'pectra',
    path: '/upgrade/pectra',
    name: 'Pectra Upgrade',
    description: 'Major upgrade introducing account abstraction (enabling smart contract functionality for regular accounts), validator experience improvements (higher balance limits, faster deposits, better exit controls), and blob scaling (doubled throughput for Layer 2 data). Named after the combination of "Prague" (execution layer upgrade, named after Devcon IV location) and "Electra" (consensus layer upgrade, named after a star in Taurus).',
    tagline: 'Account abstraction, validator upgrades, and 2x blob throughput - making Ethereum faster and cheaper.',
    status: 'Live',
    activationDate: 'May 7, 2025',
    disabled: false,
    metaEipLink: 'https://ethereum-magicians.org/t/pectra-network-upgrade-meta-thread/16809'
  },
  {
    id: 'fusaka',
    path: '/upgrade/fusaka',
    name: 'Fusaka Upgrade',
    description: 'Major improvements to Ethereum\'s scalability and user experience, including PeerDAS for enhanced data availability. Named after the combination of "Fulu" (consensus layer upgrade, named after a star) and "Osaka" (execution layer upgrade, named after a Devcon location).',
    tagline: 'PeerDAS enables nodes to specialize in storing subsets of data while maintaining security, dramatically increasing data capacity for Layer 2 networks.',
    status: 'Live',
    activationDate: 'Dec 3, 2025',
    disabled: false
  },
  {
    id: 'glamsterdam',
    path: '/upgrade/glamsterdam',
    name: 'Glamsterdam Upgrade',
    description: 'Major network upgrade featuring Block-level Access Lists and ePBS. Named after the combination of "Amsterdam" (execution layer upgrade, named after the previous Devconnect location) and "Gloas" (consensus layer upgrade, named after a star).',
    tagline: 'Enhancing Ethereum with Block-level Access Lists and ePBS for big efficiency and scalability gains.',
    status: 'Upcoming',
    activationDate: '2026',
    disabled: false,
    metaEipLink: 'https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195',
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
    id: 'hezota',
    path: '/upgrade/hezota',
    name: 'Hezotá Upgrade',
    description: 'Future network upgrade currently in early planning stages. Named after the combination of "Heze" (consensus layer upgrade, named after a star) and "Bogotá" (execution layer upgrade, named after a Devcon location).',
    tagline: 'Post-Glamsterdam network upgrade in early planning.',
    status: 'Planning',
    activationDate: 'TBD',
    disabled: false
  }
];

export const getUpgradeById = (id: string): NetworkUpgrade | undefined => {
  return networkUpgrades.find(upgrade => upgrade.id === id);
};