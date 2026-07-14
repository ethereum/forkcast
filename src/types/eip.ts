export interface ClientTeamPerspective {
  teamName: string;
  teamType: 'EL' | 'CL' | 'Both'; // Execution Layer, Consensus Layer, or both
  headlinerBlogPostUrl?: string;
  candidateBlogPostUrl?: string; // For non-headliner (CFI/PFI) commentary
}

export type ProtocolCallReference = `${'acdc' | 'acde' | 'acdt'}/${number}`;

export type ForkStatus = 'Proposed' | 'Considered' | 'Scheduled' | 'Declined' | 'Included' | 'Withdrawn';

export interface ForkStatusHistoryEntry {
  status: ForkStatus;
  call: ProtocolCallReference | null;
  date: string | null;
  timestamp?: number; // Seconds into the call recording video
}

export interface DiscussionHistoryEntry {
  call: ProtocolCallReference;
  date: string;
  timestamp?: number; // Seconds into the call recording video
}

export type HeadlinerHistoryEntry =
  | { type: 'proposed'; date: string; link: string }
  | { type: 'presented'; date: string; call: ProtocolCallReference; timestamp?: number }
  | { type: 'withdrawn'; date?: string; call?: ProtocolCallReference; timestamp?: number };

export type HeadlinerSelectionLayer = 'EL' | 'CL';

export interface HeadlinerSelection {
  status: 'open' | 'finalized';
  selected: Partial<Record<HeadlinerSelectionLayer, number>>;
  decided?: {
    date?: string;
    call?: ProtocolCallReference;
    timestamp?: number;
  };
}

export interface ForkRelationship {
  forkName: string;
  statusHistory: ForkStatusHistoryEntry[]; // Ordered oldest -> newest
  headlinerHistory?: HeadlinerHistoryEntry[]; // Ordered oldest -> newest
  /** Maximum 2 champions allowed */
  champions?: Champion[];
  notice?: {
    title: string;
    text: string;
    call?: ProtocolCallReference;
    timestamp?: number;
  };
  discussionHistory?: DiscussionHistoryEntry[];
}

export interface Champion {
  name: string;
  discord?: string;
  telegram?: string;
  email?: string;
}

export interface PendingPullRequest {
  number: number;
  url: string;
}

export interface EipFaqItem {
  question: string;
  answer: string;
}

export interface SupportingDocument {
  label: string;
  url: string;
}

export interface EIP {
  id: number;
  title: string;
  status: string;
  description: string;
  author: string;
  type: string;
  category?: string;
  createdDate: string;
  discussionLink?: string;
  reviewer?: string;
  layer?: 'EL' | 'CL';
  collection?: string;
  requires?: number[];
  /** Override for non-standard specification URLs. */
  specificationUrl?: string;
  pendingPullRequest?: PendingPullRequest;
  forkRelationships: ForkRelationship[];
  faq?: EipFaqItem[];
  laymanDescription?: string;
  northStars?: string[];
  northStarAlignment?: {
    scaleL1?: { impact?: string, description: string };
    scaleBlobs?: { impact?: string, description: string };
    improveUX?: { impact?: string, description: string };
  };
  stakeholderImpacts?: {
    endUsers: { impact?: string, description: string };
    appDevs: { impact?: string, description: string };
    walletDevs: { impact?: string, description: string };
    toolingInfra: { impact?: string, description: string };
    layer2s: { impact?: string, description: string };
    stakersNodes: { impact?: string, description: string };
    clClients: { impact?: string, description: string };
    elClients: { impact?: string, description: string };
  };
  benefits?: string[];
  tradeoffs?: string[] | null;
  supportingDocuments?: SupportingDocument[];
}

export type InclusionStage =
  | 'Proposed for Inclusion'
  | 'Considered for Inclusion'
  | 'Scheduled for Inclusion'
  | 'Declined for Inclusion'
  | 'Included'
  | 'Withdrawn'
  | 'Unknown';

export type ProposalType = 'EIP' | 'RIP';

export type KeyDecisionType = 'stage_change' | 'devnet_inclusion' | 'headliner_selected' | 'other';

export interface KeyDecision {
  original_text: string;
  timestamp: string;
  type: KeyDecisionType;
  eips: number[];
  stage_change?: {
    to: ForkStatus;
  };
  devnet?: string;
  fork?: string;
  context?: string;
}

export interface EipSpecCommit {
  sha: string;
  date: string;
  message: string;
  author: string;
  prNumber: number | null;
  patch?: string;
  additions?: number;
  deletions?: number;
}

export interface EipOpenPr {
  number: number;
  title: string;
  author: string;
  updatedAt: string;
  additions: number;
  deletions: number;
}

export interface EipSpecHistory {
  eipId: number;
  commits: EipSpecCommit[];
  openPrs?: EipOpenPr[];
}
