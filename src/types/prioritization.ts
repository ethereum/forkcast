export type RatingSystem = 'tier-abcds' | 'support-oppose' | 'priority-tier' | 'custom';

export type TierRating = 'S' | 'A' | 'B' | 'C' | 'D' | 'DFI';
export type SupportRating = 'strongly-support' | 'support' | 'weakly-support' | 'neutral' | 'oppose';
export type PriorityRating = 'tier-1' | 'tier-2';

export interface ClientStance {
  clientName: string;
  clientType: 'EL' | 'CL';
  ratingSystem: RatingSystem;
  rawRating: string | null;
  normalizedScore: number | null; // 1-5 scale, null if no stance
  comment?: string;
  sourceUrl: string;
  lastUpdated: string; // ISO date string
}

export interface EipPrioritization {
  eipId: number;
  stances: ClientStance[];
}

export interface PrioritizationData {
  fork: string;
  lastUpdated: string;
  eips: EipPrioritization[];
}

// Computed aggregates for display
export interface EipAggregateStance {
  eipId: number;
  eipTitle: string;
  layer: 'EL' | 'CL' | null;
  inclusionStage: string;
  averageScore: number | null;
  elAverageScore: number | null;
  clAverageScore: number | null;
  stanceCount: number;
  elStanceCount: number;
  clStanceCount: number;
  supportCount: number; // score >= 4
  neutralCount: number; // score 2-3
  opposeCount: number; // score <= 1
  stances: ClientStance[];
}
