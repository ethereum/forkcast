export interface NetworkUpgrade {
  id: string;
  path: string;
  name: string;
  description: string;
  tagline: string;
  status: 'Active' | 'Upcoming' | 'Planning' | 'Research';
  activationDate: string;
  disabled: boolean;
  metaEipLink?: string;
}

export const networkUpgrades: NetworkUpgrade[] = [
  {
    id: 'pectra',
    path: '/upgrade/pectra',
    name: 'Pectra Upgrade',
    description: 'Major upgrade introducing account abstraction (enabling smart contract functionality for regular accounts), validator experience improvements (higher balance limits, faster deposits, better exit controls), and blob scaling (doubled throughput for Layer 2 data). Named after the combination of "Prague" (execution layer upgrade, named after Devcon IV location) and "Electra" (consensus layer upgrade, named after a star in Taurus).',
    tagline: 'Account abstraction enables smart contract functionality for regular accounts, validator improvements increase balance limits and speed up deposits, and blob throughput doubles for better Layer 2 scaling.',
    status: 'Active',
    activationDate: 'May 7, 2025',
    disabled: true
  },
  {
    id: 'fusaka',
    path: '/upgrade/fusaka',
    name: 'Fusaka Upgrade',
    description: 'Major improvements to Ethereum\'s scalability and user experience, including PeerDAS for enhanced data availability. Named after the combination of "Fulu" (consensus layer upgrade, named after a star) and "Osaka" (execution layer upgrade, named after a Devcon location).',
    tagline: 'PeerDAS enables nodes to specialize in storing different data pieces while maintaining security, dramatically increasing data capacity for Layer 2 networks and improving overall scalability.',
    status: 'Upcoming',
    activationDate: 'TBD',
    disabled: false
  },
  {
    id: 'glamsterdam',
    path: '/upgrade/glamsterdam',
    name: 'Glamsterdam Upgrade',
    description: 'Major network upgrade whose "headliner feature" is currently being decided. Named after the combination of "Amsterdam" (execution layer upgrade, named after the previous Devconnect location) and "Gloas" (consensus layer upgrade, named after a star).',
    tagline: 'Multiple major features competing for inclusion including ePBS for MEV resistance, EVM64 for computational efficiency, Pureth for trustless data access, and several other proposals for improved UX and scaling.',
    status: 'Planning',
    activationDate: 'TBD',
    disabled: false,
    metaEipLink: 'https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195'
  }
];

export const getUpgradeById = (id: string): NetworkUpgrade | undefined => {
  return networkUpgrades.find(upgrade => upgrade.id === id);
}; 