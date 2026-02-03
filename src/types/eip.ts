export interface ClientTeamPerspective {
  teamName: string;
  teamType: 'EL' | 'CL' | 'Both'; // Execution Layer, Consensus Layer, or both
  headlinerBlogPostUrl?: string;
  candidateBlogPostUrl?: string; // For non-headliner (CFI/PFI) commentary
}

export interface ForkRelationship {
  forkName: string;
  statusHistory: Array<{
    status: 'Proposed' | 'Considered' | 'Scheduled' | 'Declined' | 'Included' | 'Withdrawn';
    call: `${'acdc' | 'acde' | 'acdt'}/${number}` | null;
    date: string | null;
    timestamp?: number; // Seconds into the call recording video
  }>; // Ordered oldest -> newest
  isHeadliner?: boolean;
  wasHeadlinerCandidate?: boolean;
  /** Maximum 2 champions allowed */
  champions?: Champion[];
  presentationHistory?: Array<{
    type: 'headliner_proposal' | 'headliner_presentation' | 'presentation' | 'debate';
    call?: `${'acdc' | 'acde' | 'acdt'}/${number}`;
    link?: string;
    date: string;
    timestamp?: number; // Seconds into the call recording video
  }>;
}

export interface Champion {
  name: string;
  discord?: string;
  telegram?: string;
  email?: string;
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
  discussionLink: string;
  reviewer?: string;
  layer?: 'EL' | 'CL';
  collection?: string;
  forkRelationships: ForkRelationship[];
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
  tradeoffs?: string[];
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