import { RatingSystem, ClientStance, EipAggregateStance } from '../types/prioritization';
import { EIP } from '../types/eip';
import { getInclusionStage, getLaymanTitle } from './index';

/**
 * Normalize a raw rating to a 1-5 scale based on the rating system
 */
export function normalizeRating(
  ratingSystem: RatingSystem,
  rawRating: string | null
): number | null {
  if (!rawRating) return null;

  const rating = rawRating.toLowerCase();

  switch (ratingSystem) {
    case 'tier-abcds':
      switch (rating) {
        case 's': return 5;
        case 'a': return 4;
        case 'b': return 3;
        case 'c': return 2;
        case 'd': return 1;
        case 'dfi': return 1;
        default: return null;
      }

    case 'support-oppose':
      switch (rating) {
        case 'strongly-support': return 5;
        case 'support': return 4;
        case 'weakly-support': return 3;
        case 'neutral': return null;
        case 'oppose': return 1;
        default: return null;
      }

    case 'priority-tier':
      switch (rating) {
        case 'tier-1': return 5;
        case 'tier-2': return 3;
        default: return null;
      }

    case 'custom':
      switch (rating) {
        case 'approve': return 5;
        case 'reject': return 1;
        case 'uncertain': return null;
        default: return null;
      }

    default:
      return null;
  }
}

/**
 * Get a human-readable label for a raw rating
 */
export function getRatingLabel(
  ratingSystem: RatingSystem,
  rawRating: string | null
): string {
  if (!rawRating) return 'No stance';

  const rating = rawRating.toLowerCase();

  switch (ratingSystem) {
    case 'tier-abcds':
      switch (rating) {
        case 's': return 'S-Tier';
        case 'a': return 'A-Tier';
        case 'b': return 'B-Tier';
        case 'c': return 'C-Tier';
        case 'd': return 'D-Tier';
        case 'dfi': return 'DFI';
        default: return rawRating;
      }

    case 'support-oppose':
      switch (rating) {
        case 'strongly-support': return 'Strong Support';
        case 'support': return 'Support';
        case 'weakly-support': return 'Weak Support';
        case 'neutral': return 'Neutral';
        case 'oppose': return 'Oppose';
        default: return rawRating;
      }

    case 'priority-tier':
      switch (rating) {
        case 'tier-1': return 'Tier 1';
        case 'tier-2': return 'Tier 2';
        default: return rawRating;
      }

    case 'custom':
      switch (rating) {
        case 'approve': return 'Approve';
        case 'reject': return 'Reject';
        case 'uncertain': return 'Uncertain';
        default: return rawRating;
      }

    default:
      return rawRating;
  }
}

/**
 * Get Tailwind color classes for a normalized score badge
 * @param score - The normalized score (1-5), null for neutral/uncertain, or undefined for no stance
 * @param hasStance - Whether the client has any stance recorded (to differentiate neutral vs not mentioned)
 */
export function getScoreColor(score: number | null, hasStance: boolean = true): string {
  if (score === null) {
    if (hasStance) {
      // Neutral/uncertain - client considered it but has no strong opinion (darker gray)
      return 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300';
    } else {
      // No stance - client didn't mention this EIP (lighter gray)
      return 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-400';
    }
  }

  switch (score) {
    case 5:
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 4:
      return 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300';
    case 3:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 2:
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    case 1:
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-400';
  }
}

/**
 * Get a short label for a normalized score
 */
export function getScoreLabel(score: number | null): string {
  if (score === null) return '?';

  switch (score) {
    case 5: return 'Strong';
    case 4: return 'Support';
    case 3: return 'Neutral';
    case 2: return 'Low';
    case 1: return 'Oppose';
    default: return '?';
  }
}

/**
 * Calculate average score from a list of stances
 */
function calculateAverage(stances: ClientStance[]): number | null {
  const scoredStances = stances.filter(s => s.normalizedScore !== null);
  if (scoredStances.length === 0) return null;

  const sum = scoredStances.reduce((acc, s) => acc + (s.normalizedScore ?? 0), 0);
  return Math.round((sum / scoredStances.length) * 10) / 10;
}

/**
 * Calculate aggregate statistics for an EIP based on client stances
 */
export function calculateEipAggregate(
  eipId: number,
  stances: ClientStance[],
  eipData: EIP | undefined,
  forkName: string
): EipAggregateStance {
  const elStances = stances.filter(s => s.clientType === 'EL');
  const clStances = stances.filter(s => s.clientType === 'CL');

  const scoredStances = stances.filter(s => s.normalizedScore !== null);

  return {
    eipId,
    eipTitle: eipData ? getLaymanTitle(eipData) : `EIP-${eipId}`,
    layer: determineEipLayer(eipData),
    inclusionStage: eipData ? getInclusionStage(eipData, forkName) : 'Unknown',
    averageScore: calculateAverage(stances),
    elAverageScore: calculateAverage(elStances),
    clAverageScore: calculateAverage(clStances),
    stanceCount: scoredStances.length,
    elStanceCount: elStances.filter(s => s.normalizedScore !== null).length,
    clStanceCount: clStances.filter(s => s.normalizedScore !== null).length,
    supportCount: scoredStances.filter(s => (s.normalizedScore ?? 0) >= 4).length,
    neutralCount: scoredStances.filter(s => {
      const score = s.normalizedScore ?? 0;
      return score >= 2 && score <= 3;
    }).length,
    opposeCount: scoredStances.filter(s => s.normalizedScore === 1).length,
    stances,
  };
}

/**
 * Determine if an EIP is EL, CL, or mixed
 */
function determineEipLayer(eip: EIP | undefined): 'EL' | 'CL' | null {
  if (!eip) return null;

  if (eip.layer) {
    return eip.layer;
  }

  // Fallback: check category
  if (eip.category === 'Core') {
    // Core EIPs are usually EL
    return 'EL';
  }

  return null;
}

/**
 * Get client initials for compact display
 */
export function getClientInitials(clientName: string): string {
  switch (clientName.toLowerCase()) {
    case 'besu': return 'Be';
    case 'erigon': return 'Er';
    case 'geth': return 'Ge';
    case 'nethermind': return 'Ne';
    case 'reth': return 'Re';
    case 'grandine': return 'Gr';
    case 'lighthouse': return 'LH';
    case 'lodestar': return 'Lo';
    case 'nimbus': return 'Ni';
    case 'prysm': return 'Pr';
    case 'teku': return 'Te';
    default: return clientName.substring(0, 2);
  }
}

export type SortField = 'eip' | 'average' | 'elAverage' | 'clAverage' | 'stanceCount' | 'stage';
export type SortDirection = 'asc' | 'desc';

/**
 * Sort EIP aggregates by various criteria
 * Secondary sort: when scores are equal, more client perspectives ranks higher
 */
export function sortEipAggregates(
  eips: EipAggregateStance[],
  sortField: SortField,
  sortDirection: SortDirection
): EipAggregateStance[] {
  return [...eips].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'eip':
        comparison = a.eipId - b.eipId;
        break;
      case 'average':
        // Null values go last
        if (a.averageScore === null && b.averageScore === null) {
          // Both null - sort by stance count (more stances first)
          return a.stanceCount - b.stanceCount === 0 ? 0 : (b.stanceCount - a.stanceCount);
        } else if (a.averageScore === null) {
          return 1;
        } else if (b.averageScore === null) {
          return -1;
        } else {
          comparison = a.averageScore - b.averageScore;
          // If scores are equal, sort by stance count (more stances ranks higher)
          if (comparison === 0) {
            // More stances = ranks higher (comes first), regardless of sort direction
            return b.stanceCount - a.stanceCount;
          }
        }
        break;
      case 'elAverage':
        if (a.elAverageScore === null && b.elAverageScore === null) {
          return b.elStanceCount - a.elStanceCount;
        } else if (a.elAverageScore === null) {
          return 1;
        } else if (b.elAverageScore === null) {
          return -1;
        } else {
          comparison = a.elAverageScore - b.elAverageScore;
          if (comparison === 0) {
            return b.elStanceCount - a.elStanceCount;
          }
        }
        break;
      case 'clAverage':
        if (a.clAverageScore === null && b.clAverageScore === null) {
          return b.clStanceCount - a.clStanceCount;
        } else if (a.clAverageScore === null) {
          return 1;
        } else if (b.clAverageScore === null) {
          return -1;
        } else {
          comparison = a.clAverageScore - b.clAverageScore;
          if (comparison === 0) {
            return b.clStanceCount - a.clStanceCount;
          }
        }
        break;
      case 'stanceCount':
        comparison = a.stanceCount - b.stanceCount;
        break;
      case 'stage': {
        const stageOrder: Record<string, number> = {
          'Included': 1,
          'Scheduled for Inclusion': 2,
          'Considered for Inclusion': 3,
          'Proposed for Inclusion': 4,
          'Declined for Inclusion': 5,
          'Withdrawn': 6,
          'Unknown': 7,
        };
        comparison = (stageOrder[a.inclusionStage] ?? 99) - (stageOrder[b.inclusionStage] ?? 99);
        // If same stage, sort by stance count (more stances first)
        if (comparison === 0) {
          return b.stanceCount - a.stanceCount;
        }
        break;
      }
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
}
