export interface ClientTeamPerspective {
  teamName: string;
  teamType: 'EL' | 'CL' | 'Both'; // Execution Layer, Consensus Layer, or both
  blogPostUrl: string;
}

export interface ForkRelationship {
  forkName: string;
  status: string;
  isHeadliner?: boolean;
  headlinerDiscussionLink?: string;
  layer?: string; // Indicates whether the headliner primarily affects Execution Layer or Consensus Layer
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
  forkRelationships: ForkRelationship[];
  laymanDescription?: string;
  northStars?: string[];
  northStarAlignment?: {
    scaleL1?: { impact: string, description: string };
    scaleBlobs?: { impact: string, description: string };
    improveUX?: { impact: string, description: string };
  };
  stakeholderImpacts?: {
    endUsers: { impact: string, description: string };
    appDevs: { impact: string, description: string };
    walletDevs: { impact: string, description: string };
    toolingInfra: { impact: string, description: string };
    layer2s: { impact: string, description: string };
    stakersNodes: { impact: string, description: string };
    clClients: { impact: string, description: string };
    elClients: { impact: string, description: string };
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
  | 'Unknown';

export type ProposalType = 'EIP' | 'RIP'; 