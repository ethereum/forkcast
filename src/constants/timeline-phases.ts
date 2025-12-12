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
    status: 'completed'
  },
  {
    id: 'cfi-decisions',
    title: 'Non-Headliner EIP CFI Decisions',
    dateRange: 'Sep 4 & 11',
    description: 'ACDC and ACDE calls select which Proposed for Inclusion EIPs advance to Considered for Inclusion.',
    status: 'current'
  },
  {
    id: 'cfi-to-sfi',
    title: 'CFI → SFI EIP Decisions',
    dateRange: 'Date TBD',
    description: 'As Glamsterdam devnets begin, final decisions on which CFI EIPs will be included in the upgrade\'s devnet.',
    status: 'upcoming'
  }
];

export const PECTRA_TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: 'devnets',
    title: 'Devnets',
    dateRange: 'Complete',
    description: 'Client teams implement and test Pectra changes on internal development networks.',
    status: 'completed'
  },
  {
    id: 'holesky',
    title: 'Holešky Testnet Deployment',
    dateRange: 'Feb 24',
    description: 'Deploy Pectra to a testnet for initial testing.',
    status: 'completed'
  },
  {
    id: 'sepolia',
    title: 'Sepolia Testnet Deployment',
    dateRange: 'Mar 5',
    description: 'Deploy Pectra to the permissioned validator testnet.',
    status: 'completed'
  },
  {
    id: 'mainnet',
    title: 'Mainnet Deployment',
    dateRange: 'May 7',
    description: 'Final deployment of Pectra to Ethereum mainnet after successful testnet validation.',
    status: 'completed'
  }
];

export const FUSAKA_TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: 'devnets',
    title: 'Devnets',
    dateRange: 'Complete',
    description: 'Client teams implement and test Fusaka changes on internal development networks.',
    status: 'completed'
  },
  {
    id: 'holesky',
    title: 'Holešky Testnet Deployment',
    dateRange: 'Oct 1',
    description: 'Deploy Fusaka to a soon-to-be deprecated testnet for initial testing.',
    status: 'completed'
  },
  {
    id: 'sepolia',
    title: 'Sepolia Testnet Deployment',
    dateRange: 'Oct 14',
    description: 'Deploy Fusaka to the permissioned validator testnet.',
    status: 'completed'
  },
  {
    id: 'hoodi',
    title: 'Hoodi Testnet Deployment',
    dateRange: 'Oct 28',
    description: 'Deploy Fusaka to the permissionless validator testnet for final testing.',
    status: 'completed'
  },
  {
    id: 'mainnet',
    title: 'Mainnet Deployment',
    dateRange: 'Dec 3',
    description: 'Final deployment of Fusaka to Ethereum mainnet after successful testnet validation.',
    status: 'completed'
  }
];

export const HEZOTA_TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: 'fork-focus',
    title: 'Fork Focus Discussion & Headliner Proposals',
    dateRange: 'Date TBD',
    description: 'ACD calls focus on discussing Hezotá\'s high-level goals. Headliner champions present proposals.',
    status: 'current'
  },
  {
    id: 'headliner-discussion',
    title: 'Headliner Discussion & Finalization',
    dateRange: 'Date TBD',
    description: 'ACD evaluates candidate headliners, solicits community feedback, and finalizes decisions.',
    status: 'upcoming'
  },
  {
    id: 'non-headliner-proposals',
    title: 'Non-Headliner EIP Proposals',
    dateRange: 'Date TBD',
    description: 'Non-headliner EIPs can now be proposed for inclusion in Hezotá.',
    status: 'upcoming'
  },
  {
    id: 'cfi-decisions',
    title: 'Non-Headliner EIP CFI Decisions',
    dateRange: 'Date TBD',
    description: 'ACDC and ACDE calls select which Proposed for Inclusion EIPs advance to Considered for Inclusion.',
    status: 'upcoming'
  },
  {
    id: 'cfi-to-sfi',
    title: 'CFI → SFI EIP Decisions',
    dateRange: 'Date TBD',
    description: 'As Hezotá devnets begin, final decisions on which CFI EIPs will be included in the upgrade\'s devnet.',
    status: 'upcoming'
  }
];

export interface ProcessPhase {
  id: string;
  title: string;
  duration: string;
  owner: string[];
  checklist: string[];
  deliverables: string[];
  notes?: string;
}

export interface DevnetDetail {
  name: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  date?: string;
  projectedDate?: string;
}

export interface TestnetDetail {
  name: string;
  status: 'completed' | 'in-progress' | 'upcoming' | 'deprecated';
  date?: string;
  projectedDate?: string;
}

export interface SubstepDetail {
  name: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  date?: string;
  projectedDate?: string;
}

export interface ForkPhaseProgress {
  phaseId: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  actualStartDate?: string;
  actualEndDate?: string;
  projectedDate?: string;
  progressNotes?: string;
  devnets?: DevnetDetail[];
  testnets?: TestnetDetail[];
  substeps?: SubstepDetail[];
}

export interface ForkProgress {
  forkName: string;
  phases: ForkPhaseProgress[];
}

export const FUSAKA_PROGRESS: ForkProgress = {
  forkName: 'Fusaka',
  phases: [
    {
      phaseId: 'headliner-selection',
      status: 'completed',
      progressNotes: 'Process not yet formalized for Fusaka'
    },
    {
      phaseId: 'eip-selection',
      status: 'completed',
      progressNotes: 'Process not yet formalized for Fusaka'
    },
    {
      phaseId: 'development',
      status: 'completed',
      actualStartDate: 'May 26, 2025',
      actualEndDate: 'Sep 10, 2025',
      progressNotes: '6 devnets completed, stable devnet achieved',
      devnets: [
        { name: 'Devnet-0', status: 'completed', date: 'May 26, 2025' },
        { name: 'Devnet-1', status: 'completed', date: 'Jun 9, 2025' },
        { name: 'Devnet-2', status: 'completed', date: 'Jun 26, 2025' },
        { name: 'Devnet-3', status: 'completed', date: 'Jul 23, 2025' },
        { name: 'Devnet-4', status: 'completed', date: 'Aug 8, 2025' },
        { name: 'Devnet-5', status: 'completed', date: 'Sep 10, 2025' }
      ]
    },
    {
      phaseId: 'public-testnets',
      status: 'completed',
      actualStartDate: 'Oct 1, 2025',
      actualEndDate: 'Oct 28, 2025',
      progressNotes: 'Holešky (Oct 1) → Sepolia (Oct 14) → Hoodi (Oct 28)',
      testnets: [
        { name: 'Holešky', status: 'completed', date: 'Oct 1, 2025' },
        { name: 'Sepolia', status: 'completed', date: 'Oct 14, 2025' },
        { name: 'Hoodi', status: 'completed', date: 'Oct 28, 2025' }
      ]
    },
    {
      phaseId: 'mainnet-deployment',
      status: 'completed',
      actualEndDate: 'Dec 3, 2025',
      progressNotes: 'Mainnet activation complete'
    }
  ]
};

// Glamsterdam progress with actual dates for completed milestones
export const GLAMSTERDAM_PROGRESS: ForkProgress = {
  forkName: 'Glamsterdam',
  phases: [
    {
      phaseId: 'headliner-selection',
      status: 'completed',
      actualStartDate: 'June 2025',
      actualEndDate: 'Aug 14, 2025',
      progressNotes: 'Headliner proposals received and finalized',
      substeps: [
        {
          name: 'Proposal Deadline',
          status: 'completed',
          date: 'Jun 20, 2025'
        },
        {
          name: 'Selection Deadline',
          status: 'completed',
          date: 'Aug 14, 2025'
        }
      ]
    },
    {
      phaseId: 'eip-selection',
      status: 'in-progress',
      actualStartDate: 'Aug 2025',
      projectedDate: 'Dec 2025',
      progressNotes: 'PFI deadline completed, CFI/SFI decisions ongoing',
      substeps: [
        {
          name: 'PFI Deadline',
          status: 'completed',
          date: 'Oct 30, 2025'
        },
        {
          name: 'CFI Deadline',
          status: 'upcoming',
          projectedDate: 'Dec 15, 2025'
        }
      ]
    },
    {
      phaseId: 'development',
      status: 'upcoming',
      projectedDate: 'Q1-Q2 2026',
      progressNotes: 'Devnets expected to begin Q1 2026',
      devnets: [
        { name: 'Devnet-0', status: 'upcoming', projectedDate: 'Q1 2026' },
        { name: 'Devnet-1', status: 'upcoming', projectedDate: 'Q1 2026' },
        { name: 'Devnet-2', status: 'upcoming', projectedDate: 'Q1 2026' },
        { name: 'Devnet-3', status: 'upcoming', projectedDate: 'Q1-Q2 2026' },
        { name: 'Devnet-4', status: 'upcoming', projectedDate: 'Q2 2026' },
        { name: 'Devnet-5', status: 'upcoming', projectedDate: 'Q2 2026' }
      ]
    },
    {
      phaseId: 'public-testnets',
      status: 'upcoming',
      projectedDate: 'Q3 2026',
      progressNotes: 'Sequential testnet deployments',
      testnets: [
        { name: 'Holešky', status: 'deprecated' },
        { name: 'Sepolia', status: 'upcoming', projectedDate: 'Q3 2026' },
        { name: 'Hoodi', status: 'upcoming', projectedDate: 'Q3 2026' }
      ]
    },
    {
      phaseId: 'mainnet-deployment',
      status: 'upcoming',
      projectedDate: 'Q4 2026',
      progressNotes: 'Target mainnet activation Q4 2026'
    }
  ]
};

export const HEZOTA_PROJECTION: ForkProgress = {
  forkName: 'Hezota',
  phases: [
    {
      phaseId: 'headliner-selection',
      status: 'upcoming',
      projectedDate: 'Q1-Q2 2026',
      progressNotes: 'Headliner review debate: timing depends on Glamsterdam progress',
      substeps: [
        {
          name: 'Proposal Deadline',
          status: 'upcoming',
          projectedDate: 'Q1 2026'
        },
        {
          name: 'Selection Deadline',
          status: 'upcoming',
          projectedDate: 'Q2 2026'
        }
      ]
    },
    {
      phaseId: 'eip-selection',
      status: 'upcoming',
      projectedDate: 'Q2-Q3 2026',
      progressNotes: 'Opens after headliner finalization',
      substeps: [
        {
          name: 'PFI Deadline',
          status: 'upcoming',
          projectedDate: 'Q2 2026'
        },
        {
          name: 'CFI Deadline',
          status: 'upcoming',
          projectedDate: 'Q3 2026'
        }
      ]
    },
    {
      phaseId: 'development',
      status: 'upcoming',
      projectedDate: 'Q3-Q4 2026',
      progressNotes: 'Timing depends on headliner selection date',
      devnets: [
        { name: 'Devnet-0', status: 'upcoming', projectedDate: 'Q3 2026' },
        { name: 'Devnet-1', status: 'upcoming', projectedDate: 'Q3 2026' },
        { name: 'Devnet-2', status: 'upcoming', projectedDate: 'Q3 2026' },
        { name: 'Devnet-3', status: 'upcoming', projectedDate: 'Q3-Q4 2026' },
        { name: 'Devnet-4', status: 'upcoming', projectedDate: 'Q4 2026' },
        { name: 'Devnet-5', status: 'upcoming', projectedDate: 'Q4 2026' }
      ]
    },
    {
      phaseId: 'public-testnets',
      status: 'upcoming',
      projectedDate: 'Q1-Q2 2027',
      progressNotes: 'Sequential testnet deployments',
      testnets: [
        { name: 'Holešký', status: 'deprecated' },
        { name: 'Sepolia', status: 'upcoming', projectedDate: 'Q1-Q2 2027' },
        { name: 'Hoodi', status: 'upcoming', projectedDate: 'Q1-Q2 2027' }
      ]
    },
    {
      phaseId: 'mainnet-deployment',
      status: 'upcoming',
      projectedDate: 'Q2 2027',
      progressNotes: 'Target mainnet activation Q2 2027'
    }
  ]
};

export const UPGRADE_PROCESS_PHASES: ProcessPhase[] = [
  {
    id: 'fork-focus',
    title: 'Fork Focus Definition',
    duration: '~6-9 months pre-mainnet',
    owner: ['ACD facilitators'],
    checklist: [
      'Schedule fork focus discussion on ACD calls',
      'Solicit community input on strategic priorities',
      'Document agreed-upon focus areas in Meta EIP draft',
      'Communicate focus to potential headliner champions'
    ],
    deliverables: [
      'Meta EIP created with fork focus section',
      'Forum post announcing focus and timeline'
    ],
    notes: 'Can overlap with previous fork deployment. Max 1-2 focus areas.'
  },
  {
    id: 'headliner-selection',
    title: 'Headliner Selection',
    duration: '~2-3 months',
    owner: ['EIP champions', 'ACD facilitators'],
    checklist: [
      'Open call for headliner proposals (forum post)',
      'Champions post structured proposals on Ethereum Magicians',
      'Schedule dedicated roadmap calls for presentations',
      'Open community review window (2-4 weeks)',
      'Collect feedback from L2s, infra teams, app devs',
      'Schedule "Last Call" for final assessment',
      'Hold final selection vote on dedicated call',
      'Update Meta EIP with selected headliners'
    ],
    deliverables: [
      '1-2 selected headliner EIPs',
      'Updated Meta EIP with headliner status',
      'Champion commitments documented'
    ],
    notes: 'Typically 4-6 months before previous fork ships. Limit to 1-2 headliners.'
  },
  {
    id: 'eip-selection',
    title: 'Non-headliner EIP Selection',
    duration: '1-2 months initial, ongoing',
    owner: ['EIP authors', 'Client teams', 'ACD facilitators'],
    checklist: [
      'Authors open PR to Meta EIP for PFI status',
      'Client teams signal support (need >1 for CFI)',
      'Track CFI EIPs for implementation progress',
      'Client teams commit to implementation for SFI',
      'Update Meta EIP as statuses change',
      'Apply DFI when needed (no reason required)'
    ],
    deliverables: [
      'Meta EIP with all PFI/CFI/SFI/DFI tracked',
      'Client team support documented per EIP'
    ],
    notes: 'PFI opens after headliner selection. CFI requires >1 client team. SFI = committed.'
  },
  {
    id: 'development',
    title: 'Devnets (0 → N)',
    duration: '3-5 months',
    owner: ['Client teams', 'Devops', 'ACDT facilitators'],
    checklist: [
      'Spin up devnet-0 with prototype implementations',
      'Iterate through devnet-1 to devnet-N',
      'Track client implementation status per EIP',
      'Identify stable devnet ready for testnet',
      'Communicate readiness to broader ecosystem'
    ],
    deliverables: [
      '1-10 devnets launched and tested',
      'Stable devnet running for 1+ week',
      'All SFI EIPs implemented across clients',
      'Known issues documented and resolved'
    ],
    notes: 'Expect 1-10 devnets. 1-2 weeks between launches.'
  },
  {
    id: 'public-testnets',
    title: 'Public Testnets (Sequential)',
    duration: '2-3 months total',
    owner: ['Client teams', 'Devops', 'ACDT facilitators'],
    checklist: [
      'Deploy to first testnet ~30 days after last devnet',
      'Deploy to second testnet ~2 weeks after first',
      'Run mainnet shadow forks 1-2 weeks pre-mainnet',
      'Validate mainnet state compatibility',
      'Confirm all clients passing all tests',
      'Communicate timeline for mainnet'
    ],
    deliverables: [
      'Testnet upgrades (Sepolia, Hoodi)',
      'Mainnet shadow fork(s) validated',
      'Client releases tagged and ready'
    ],
    notes: 'Typical: Sepolia → Hoodi. ~2 weeks between. Shadow forks last.'
  },
  {
    id: 'mainnet-deployment',
    title: 'Mainnet Activation',
    duration: '2-4 weeks prep',
    owner: ['Client teams', 'ACD facilitators', 'Comms'],
    checklist: [
      'All clients publish mainnet-ready releases',
      'Announce activation block/timestamp (Wednesday preferred)',
      'Wait minimum 2 weeks for operator upgrades',
      'Run final checks on activation day',
      'Monitor post-activation for 24-48 hours',
      'Conduct a retrospective of the upgrade process'
    ],
    deliverables: [
      'All client releases published',
      'Activation date/block announced',
      'Supermajority client adoption achieved',
      'Successful mainnet activation'
    ],
    notes: 'Schedule Wed monitoring. Need ~60-70% adoption. 2-week minimum window.'
  }
];