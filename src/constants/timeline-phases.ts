import type {
  TimelinePhase,
  ProcessPhase,
  ForkProgress,
  MacroPhaseConfig,
  SubstepDetail
} from '../types/timeline';
import devnetLaunches from '../data/generated/devnet-launches.json';
import { forkMilestones } from '../data/milestones';
import {
  BUILD_DATE,
  addDays,
  deploymentPhase,
  formatMilestone,
  formatRange,
  mainnetProgress,
  milestoneStatus,
  rangeStatus,
  testnetsProgress,
  type Milestone
} from '../utils/milestones';

/**
 * A timeline phase for a network deployment, dated and statused from its
 * milestone. The milestone's note (if any) follows the description.
 */
const deployment = (
  id: string,
  title: string,
  description: string,
  milestone: Milestone,
  today: string
): TimelinePhase => {
  const { dateRange, note, status } = deploymentPhase(milestone, today);
  return { id, title, dateRange, description: note ? `${description} ${note}` : description, status };
};

const pectra = forkMilestones.pectra;
const fusaka = forkMilestones.fusaka;
const glamsterdam = forkMilestones.glamsterdam;
const hegota = forkMilestones.hegota;

export const buildGlamsterdamTimelinePhases = (today: string): TimelinePhase[] => [
  {
    id: 'devnets',
    title: 'Devnets',
    dateRange: 'Feb – Sep 2026',
    description: 'Client teams implemented and tested Glamsterdam changes on internal development networks. Devnet-11, the last of the series, ran Sep 9 and has been shut down.',
    status: 'completed'
  },
  deployment(
    'plataberget',
    'Platåberget Testnet Deployment',
    'Deploy Glamsterdam to a purpose-built public testnet for initial testing. The network launched Aug 13 and Gloas activated Aug 20.',
    glamsterdam.plataberget,
    today
  ),
  deployment(
    'sepolia',
    'Sepolia Testnet Deployment',
    'Deploy Glamsterdam to the permissioned validator testnet.',
    glamsterdam.sepolia,
    today
  ),
  deployment(
    'hoodi',
    'Hoodi Testnet Deployment',
    'Deploy Glamsterdam to the permissionless validator testnet for final testing.',
    glamsterdam.hoodi,
    today
  ),
  deployment(
    'mainnet',
    'Mainnet Deployment',
    'Final deployment of Glamsterdam to Ethereum mainnet after successful testnet validation.',
    glamsterdam.mainnet,
    today
  )
];

export const GLAMSTERDAM_TIMELINE_PHASES = buildGlamsterdamTimelinePhases(BUILD_DATE);

export const PECTRA_TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: 'devnets',
    title: 'Devnets',
    dateRange: 'Complete',
    description: 'Client teams implement and test Pectra changes on internal development networks.',
    status: 'completed'
  },
  deployment(
    'holesky',
    'Holešky Testnet Deployment',
    'Deploy Pectra to a testnet for initial testing.',
    pectra.holesky,
    BUILD_DATE
  ),
  deployment(
    'sepolia',
    'Sepolia Testnet Deployment',
    'Deploy Pectra to the permissioned validator testnet.',
    pectra.sepolia,
    BUILD_DATE
  ),
  deployment(
    'mainnet',
    'Mainnet Deployment',
    'Final deployment of Pectra to Ethereum mainnet after successful testnet validation.',
    pectra.mainnet,
    BUILD_DATE
  )
];

export const FUSAKA_TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: 'devnets',
    title: 'Devnets',
    dateRange: 'Complete',
    description: 'Client teams implement and test Fusaka changes on internal development networks.',
    status: 'completed'
  },
  deployment(
    'holesky',
    'Holešky Testnet Deployment',
    'Deploy Fusaka to a soon-to-be deprecated testnet for initial testing.',
    fusaka.holesky,
    BUILD_DATE
  ),
  deployment(
    'sepolia',
    'Sepolia Testnet Deployment',
    'Deploy Fusaka to the permissioned validator testnet.',
    fusaka.sepolia,
    BUILD_DATE
  ),
  deployment(
    'hoodi',
    'Hoodi Testnet Deployment',
    'Deploy Fusaka to the permissionless validator testnet for final testing.',
    fusaka.hoodi,
    BUILD_DATE
  ),
  deployment(
    'mainnet',
    'Mainnet Deployment',
    'Final deployment of Fusaka to Ethereum mainnet after successful testnet validation.',
    fusaka.mainnet,
    BUILD_DATE
  )
];

// Each window runs from one milestone to the next; the day after a deadline
// opens the following window.
const hegotaWindows: [string, string, Milestone, Milestone | undefined, string][] = [
  [
    'fork-focus',
    'Fork Focus Discussion & Headliner Proposals',
    hegota.forkFocusStart,
    hegota.headlinerProposalDeadline,
    'ACD calls focus on discussing Hegotá\'s high-level goals. Headliner champions present proposals.'
  ],
  [
    'headliner-discussion',
    'Headliner Discussion & Finalization',
    { date: addDays(hegota.headlinerProposalDeadline.date, 1) },
    hegota.headlinerSelectionDeadline,
    'ACD evaluates candidate headliners, solicits community feedback, and finalizes decisions.'
  ],
  [
    'non-headliner-proposals',
    'Non-Headliner EIP Proposals',
    hegota.pfiWindowOpens,
    hegota.pfiDeadline,
    'Non-headliner EIPs can be proposed for inclusion in Hegotá. Window opens April 9th, deadline August 6th.'
  ],
  [
    'cfi-decisions',
    'Non-Headliner EIP CFI Decisions',
    { date: addDays(hegota.pfiDeadline.date, 1) },
    hegota.cfiDeadline,
    'ACDC and ACDE calls select which Proposed for Inclusion EIPs advance to Considered for Inclusion.'
  ],
  [
    'cfi-to-sfi',
    'CFI → SFI EIP Decisions',
    hegota.cfiDeadline,
    undefined,
    'As Hegotá devnets begin, final decisions on which CFI EIPs will be included in the upgrade\'s devnet.'
  ]
];

export const HEGOTA_TIMELINE_PHASES: TimelinePhase[] = hegotaWindows.map(
  ([id, title, start, end, description]) => ({
    id,
    title,
    dateRange: formatRange(start, end),
    description,
    status: rangeStatus(start, end, BUILD_DATE)
  })
);

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
      actualStartDate: formatMilestone(fusaka.devnets[0]),
      actualEndDate: formatMilestone(fusaka.devnets[fusaka.devnets.length - 1]),
      progressNotes: '6 devnets completed, stable devnet achieved',
      devnets: fusaka.devnets.map((devnet, i) => ({
        name: `Devnet-${i}`,
        status: milestoneStatus(devnet, BUILD_DATE),
        date: formatMilestone(devnet)
      }))
    },
    {
      phaseId: 'public-testnets',
      ...testnetsProgress(
        [
          { name: 'Holešky', milestone: fusaka.holesky },
          { name: 'Sepolia', milestone: fusaka.sepolia },
          { name: 'Hoodi', milestone: fusaka.hoodi }
        ],
        BUILD_DATE
      )
    },
    {
      phaseId: 'mainnet-deployment',
      ...mainnetProgress(fusaka.mainnet, BUILD_DATE)
    }
  ]
};

/** A process deadline as a progress substep: its date once agreed, else the proposal. */
const deadline = (name: string, milestone: Milestone, today: string): SubstepDetail => ({
  name,
  status: milestoneStatus(milestone, today),
  ...(milestone.proposed ? { proposedDate: formatMilestone(milestone) } : { date: formatMilestone(milestone) })
});

/** Glamsterdam's public testnets in deployment order. Also feeds the testnet banner. */
export const GLAMSTERDAM_TESTNETS: { name: string; networkId: string; milestone: Milestone }[] = [
  { name: 'Platåberget', networkId: 'glamsterdam-devnet-8', milestone: glamsterdam.plataberget },
  { name: 'Sepolia', networkId: 'sepolia', milestone: glamsterdam.sepolia },
  { name: 'Hoodi', networkId: 'hoodi', milestone: glamsterdam.hoodi }
];

// Glamsterdam progress with actual dates for completed milestones
const buildRawGlamsterdamProgress = (today: string): ForkProgress => ({
  forkName: 'Glamsterdam',
  phases: [
    {
      phaseId: 'headliner-selection',
      status: 'completed',
      actualStartDate: 'June 2025',
      actualEndDate: formatMilestone(glamsterdam.headlinerSelectionDeadline),
      progressNotes: 'Headliner proposals received and finalized',
      substeps: [
        deadline('Proposal Deadline', glamsterdam.headlinerProposalDeadline, today),
        deadline('Selection Deadline', glamsterdam.headlinerSelectionDeadline, today)
      ]
    },
    {
      phaseId: 'eip-selection',
      status: 'completed',
      actualStartDate: 'Aug 2025',
      actualEndDate: formatMilestone(glamsterdam.cfiDeadline),
      progressNotes: 'PFI and CFI deadlines completed, SFI decisions finalized',
      substeps: [
        deadline('PFI Deadline', glamsterdam.pfiDeadline, today),
        deadline('CFI Deadline', glamsterdam.cfiDeadline, today)
      ]
    },
    {
      phaseId: 'development',
      status: 'completed',
      actualStartDate: 'Feb 2026',
      actualEndDate: 'Sep 2026',
      progressNotes: 'Devnet-11 ran Sep 9 and has been shut down',
      // Only the planned devnets are declared here. Once one launches,
      // enrichDevnetDates takes over its date and status from
      // devnet-launches.json. Devnet-8 doubles as the Platåberget public testnet.
      devnets: [
        { name: 'Devnet-0', status: 'upcoming' },
        { name: 'Devnet-1', status: 'upcoming' },
        { name: 'Devnet-2', status: 'upcoming' },
        { name: 'Devnet-3', status: 'upcoming' },
        { name: 'Devnet-4', status: 'upcoming' },
        { name: 'Devnet-5', status: 'upcoming' },
        { name: 'Devnet-6', status: 'upcoming' },
        { name: 'Devnet-7', status: 'upcoming' },
        { name: 'Devnet-8', status: 'upcoming' },
        { name: 'Devnet-9', status: 'upcoming' },
        // Devnet-10 ran as a short internal test with no published spec, so it
        // never reaches devnet-launches.json and its status is set by hand.
        // Cartographoor drops the config of an inactive network, so its launch
        // date is not recoverable.
        { name: 'Devnet-10', status: 'completed' },
        { name: 'Devnet-11', status: 'upcoming' }
      ]
    },
    {
      phaseId: 'public-testnets',
      projectedDate: 'Q3 2026',
      ...testnetsProgress(GLAMSTERDAM_TESTNETS, today)
    },
    {
      phaseId: 'mainnet-deployment',
      ...mainnetProgress(glamsterdam.mainnet, today)
    }
  ]
});

const RAW_HEGOTA_PROGRESS: ForkProgress = {
  forkName: 'Hegota',
  phases: [
    {
      phaseId: 'headliner-selection',
      status: 'completed',
      actualStartDate: formatMilestone(hegota.forkFocusStart),
      actualEndDate: formatMilestone(hegota.headlinerSelectionDeadline),
      progressNotes: 'FOCIL (EIP-7805) and Frame Transaction (EIP-8141) both SFI\'d as headliners',
      substeps: [
        deadline('Proposal Deadline', hegota.headlinerProposalDeadline, BUILD_DATE),
        deadline('Selection Deadline', hegota.headlinerSelectionDeadline, BUILD_DATE)
      ]
    },
    {
      phaseId: 'eip-selection',
      status: rangeStatus(hegota.pfiWindowOpens, hegota.cfiDeadline, BUILD_DATE),
      projectedDate: 'Q2-Q3 2026',
      progressNotes: 'Non-headliner EIP proposal window: April 9th – August 6th',
      substeps: [
        deadline('PFI Deadline', hegota.pfiDeadline, BUILD_DATE),
        deadline('CFI Deadline', hegota.cfiDeadline, BUILD_DATE)
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
      ...mainnetProgress(hegota.mainnet, BUILD_DATE)
    }
  ]
};

type DevnetLaunch = { version: number; date: string; active: boolean };

function enrichDevnetDates(progress: ForkProgress, forkKey: string): ForkProgress {
  const launches = (devnetLaunches as Record<string, DevnetLaunch[]>)[forkKey] ?? [];
  if (!launches.length) return progress;

  return {
    ...progress,
    phases: progress.phases.map(phase => {
      if (phase.phaseId !== 'development' || !phase.devnets) return phase;
      return {
        ...phase,
        devnets: phase.devnets.map(devnet => {
          const version = parseInt(devnet.name.replace('Devnet-', ''), 10);
          const launch = launches.find(l => l.version === version);
          if (!launch) return devnet;
          return {
            ...devnet,
            status: launch.active ? 'in-progress' : 'completed',
            date: launch.date,
          };
        }),
      };
    }),
  };
}

export const buildGlamsterdamProgress = (today: string): ForkProgress =>
  enrichDevnetDates(buildRawGlamsterdamProgress(today), 'glamsterdam');
export const GLAMSTERDAM_PROGRESS = buildGlamsterdamProgress(BUILD_DATE);
export const HEGOTA_PROGRESS = enrichDevnetDates(RAW_HEGOTA_PROGRESS, 'hegota');

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

export const MACRO_PHASES: MacroPhaseConfig[] = [
  { id: 'headliners', label: 'Headliners', description: 'Fork focus definition & headliner selection' },
  { id: 'scoping', label: 'Scoping', description: 'Non-headliner EIP selection (PFI/CFI/SFI)' },
  { id: 'devnets', label: 'Devnets', description: 'Client implementation across devnets (0 through N)' },
  { id: 'testnets', label: 'Testnets', description: 'Public testnet deployments (Sepolia, Hoodi)' },
  { id: 'mainnet', label: 'Mainnet', description: 'Mainnet activation' },
];

export const FORK_PROGRESS_MAP: Record<string, ForkProgress> = {
  fusaka: FUSAKA_PROGRESS,
  glamsterdam: GLAMSTERDAM_PROGRESS,
  hegota: HEGOTA_PROGRESS,
};