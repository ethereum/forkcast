/**
 * Single source of truth for the crawler-visible metadata of every static route.
 *
 * Each static .astro page spreads its entry onto the shared Layout
 * (`<Layout {...staticPageMetadata.pectra} />`) instead of inlining the title and
 * description, so the copy lives in one place and the `satisfies` check guarantees
 * every entry has the right shape. Per-item dynamic routes (eips/[id], calls/[type],
 * calls/[...path], devnets/[id]) compute their metadata from route data in
 * getStaticPaths() and intentionally stay out of this static registry.
 */
export interface PageMetadata {
  title: string;
  description: string;
}

export const staticPageMetadata = {
  home: {
    title: 'Forkcast - Ethereum Upgrade Tracker',
    description:
      "See what's on the horizon and how it impacts you. Track Ethereum network upgrades and explore how changes affect users, developers, and the ecosystem.",
  },
  upgrades: {
    title: 'Network Upgrades - Forkcast',
    description: 'Catalog of Ethereum network upgrades - in progress, live, and historical.',
  },
  schedule: {
    title: 'ACD Planning Sandbox - Forkcast',
    description: 'Internal planning tool for ACD participants. Explore hypothetical upgrade timelines.',
  },
  agenda: {
    title: 'Agenda Planner - Forkcast',
    description:
      'Agenda planning for Ethereum AllCoreDevs facilitators. Suggested topics, open action items, deferred decisions, and EIP discussion history.',
  },
  decisions: {
    title: 'Key Decisions - Forkcast',
    description: 'Key decisions from Ethereum AllCoreDevs meetings.',
  },
  rank: {
    title: 'Headliner Rankings - Forkcast',
    description: 'Rank and compare headliner proposals for upcoming Ethereum network upgrades.',
  },
  eipsIndex: {
    title: 'EIP Directory - Forkcast',
    description:
      'Browse all Ethereum Improvement Proposals tracked on Forkcast. Filter by status, network upgrade, and type.',
  },
  callsIndex: {
    title: 'Protocol Calls - Forkcast',
    description:
      'Browse Ethereum protocol development calls including AllCoreDevs Consensus, Execution, and Testing meetings.',
  },
  devnetsIndex: {
    title: 'Devnet Prioritization - Forkcast',
    description:
      'Track devnet inclusion status, test complexity, and client support for EIPs in upcoming network upgrades.',
  },
  pectra: {
    title: 'Pectra Upgrade - Forkcast',
    description:
      'Account abstraction, validator upgrades, and 2x blob throughput - making Ethereum faster and cheaper. Live on mainnet May 7, 2025.',
  },
  fusaka: {
    title: 'Fusaka Upgrade - Forkcast',
    description:
      'PeerDAS enables nodes to specialize in storing subsets of data while maintaining security, dramatically increasing data capacity for Layer 2 networks. Live on mainnet Dec 3, 2025.',
  },
  hegota: {
    title: 'Hegotá Upgrade - Forkcast',
    description: 'Hegotá network upgrade: overview, EIP proposals, and test complexity.',
  },
  hegotaTestComplexity: {
    title: 'Hegotá Test Complexity - Forkcast',
    description: 'Analyze STEEL test complexity assessments for EIPs proposed for Hegotá.',
  },
  glamsterdam: {
    title: 'Glamsterdam Upgrade - Forkcast',
    description:
      'Enhancing Ethereum with Block-level Access Lists and ePBS for big efficiency and scalability gains.',
  },
  glamsterdamStakeholders: {
    title: 'Glamsterdam by Stakeholder - Forkcast',
    description:
      'EIPs relevant to app developers, wallet devs, L2s, and other stakeholders in the Glamsterdam upgrade.',
  },
  glamsterdamDevnetInclusion: {
    title: 'Glamsterdam Devnet Inclusion - Forkcast',
    description: 'Devnet inclusion status for EIPs proposed for the Glamsterdam network upgrade.',
  },
  glamsterdamClientPriority: {
    title: 'Glamsterdam Client Priority - Forkcast',
    description: 'Aggregate view of Ethereum client team stances on EIPs proposed for Glamsterdam.',
  },
  glamsterdamTestComplexity: {
    title: 'Glamsterdam Test Complexity - Forkcast',
    description: 'Analyze STEEL test complexity assessments for EIPs proposed for Glamsterdam.',
  },
} satisfies Record<string, PageMetadata>;
