export type RatingSystem =
  | 'tier-abcds'
  /** Same S/A/B/C/D letters, but D is an explicit "reject this" request, not low priority. */
  | 'tier-abcds-reject'
  | 'support-oppose'
  | 'priority-tier'
  | 'custom';

export type TierRating = 'S' | 'A' | 'B' | 'C' | 'D' | 'DFI';
export type SupportRating = 'strongly-support' | 'support' | 'weakly-support' | 'neutral' | 'oppose';
export type PriorityRating = 'tier-1' | 'tier-2';

/** EL/CL client teams, or a non-client participant (EF Architecture Team, Ethlabs, ...). */
export type TeamType = 'EL' | 'CL' | 'OTHER';

export interface ClientStance {
  clientName: string;
  clientType: TeamType;
  ratingSystem: RatingSystem;
  rawRating: string | null;
  normalizedScore: number | null; // 0-5 scale, null if no stance
  comment?: string;
  sourceUrl: string;
  lastUpdated: string; // ISO date string
}

export interface EipPrioritization {
  eipId: number;
  stances: ClientStance[];
}

export interface TeamEntry {
  name: string;
  type: TeamType;
  /** Two-character label for the compact table badges. */
  initials: string;
}

export interface PrioritizationData {
  fork: string;
  lastUpdated: string;
  /** Who gets a column, declared per fork so the table has shape before any stance exists. */
  teams: TeamEntry[];
  eips: EipPrioritization[];
}

// Computed aggregates for display
export interface EipAggregateStance {
  eipId: number;
  eipTitle: string;
  layer: 'EL' | 'CL' | null;
  inclusionStage: string;
  // Scores and counts below cover client teams only; OTHER teams get a column but
  // deliberately don't move the averages or raise the rejection flag.
  averageScore: number | null;
  elAverageScore: number | null;
  clAverageScore: number | null;
  stanceCount: number;
  elStanceCount: number;
  clStanceCount: number;
  supportCount: number; // top two tiers of the fork's scale
  neutralCount: number; // score 2-3
  opposeCount: number; // score <= 1
  /** Explicit "reject this" requests from client teams. */
  rejectCount: number;
  stances: ClientStance[];
}
