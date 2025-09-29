export interface TimelinePhase {
  id: string;
  title: string;
  dateRange: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

export const GLAMSTERDAM_TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: 'fork-focus',
    title: 'Fork Focus Discussion & Headliner Proposals',
    dateRange: 'May 26 - June 20',
    description: 'ACD calls focus on discussing Glamsterdam\'s high-level goals. Headliner champions present proposals.',
    status: 'completed'
  },
  {
    id: 'headliner-discussion',
    title: 'Headliner Discussion & Finalization',
    dateRange: 'June 23 - July 17',
    description: 'ACD evaluates candidate headliners, solicits community feedback, and finalizes decisions.',
    status: 'completed'
  },
  {
    id: 'non-headliner-proposals',
    title: 'Non-Headliner EIP Proposals',
    dateRange: 'July 21 - Aug 21',
    description: 'Non-headliner EIPs can now be proposed for inclusion in Glamsterdam.',
    status: 'current'
  },
  {
    id: 'cfi-decisions',
    title: 'Non-Headliner EIP CFI Decisions',
    dateRange: 'Sep 4 & 11',
    description: 'ACDC and ACDE calls select which Proposed for Inclusion EIPs advance to Considered for Inclusion.',
    status: 'upcoming'
  },
  {
    id: 'cfi-to-sfi',
    title: 'CFI → SFI EIP Decisions',
    dateRange: 'Date TBD',
    description: 'As Glamsterdam devnets begin, final decisions on which CFI EIPs will be included in the upgrade\'s devnet.',
    status: 'upcoming'
  }
];

export const FUSAKA_TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: 'devnets',
    title: 'Devnets',
    dateRange: 'In Progress',
    description: 'Client teams implement and test Fusaka changes on internal development networks.',
    status: 'current'
  },
  {
    id: 'holesky',
    title: 'Holešky Testnet Deployment',
    dateRange: 'Oct 1',
    description: 'Deploy Fusaka to a soon-to-be deprecated testnet for initial testing.',
    status: 'upcoming'
  },
  {
    id: 'sepolia',
    title: 'Sepolia Testnet Deployment',
    dateRange: 'Oct 14',
    description: 'Deploy Fusaka to the permissioned validator testnet.',
    status: 'upcoming'
  },
  {
    id: 'hoodi',
    title: 'Hoodi Testnet Deployment',
    dateRange: 'Oct 28',
    description: 'Deploy Fusaka to the permissionless validator testnet for final testing.',
    status: 'upcoming'
  },
  {
    id: 'mainnet',
    title: 'Mainnet Deployment',
    dateRange: 'TBD',
    description: 'Final deployment of Fusaka to Ethereum mainnet after successful testnet validation.',
    status: 'upcoming'
  }
];