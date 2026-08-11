/**
 * EIP metadata + spec search, extracted verbatim from the former EipSearchModal
 * so the behavior (weights, filter semantics, the FAQ-only tab deep link, the
 * spec-result merge) survives the move into global search unchanged.
 */
import type { EIP } from '../../types/eip';
import { getLaymanTitle } from '../../utils/eip';
import { matchesAlias } from './eipAliases';
import type { EipResult } from './types';

export interface EipSearchResult {
  eip: EIP;
  matchScore: number;
  matchedFields: string[];
}

export interface EipSearchFilters {
  forkName: string;
  forkStatus: string;
  layer: string;
}

export const EMPTY_EIP_FILTERS: EipSearchFilters = {
  forkName: 'all',
  forkStatus: 'all',
  layer: 'all',
};

// Search weights for different fields
export const SEARCH_WEIGHTS = {
  id: 100,
  // Above the sum of every other weight: an alias names one EIP outright, and a
  // short acronym like "bal" is a substring of unrelated prose ("MAX_EFFECTIVE_
  // BALANCE") often enough to stack several weaker fields on the wrong EIP.
  alias: 200,
  title: 50,
  laymanDescription: 30,
  description: 20,
  author: 15,
  benefits: 10,
  northStars: 10,
  faq: 8,
};

// Active forks in reverse chronological order
export const ACTIVE_FORKS = ['Hegota', 'Glamsterdam', 'Fusaka', 'Pectra'] as const;

// Fork statuses
export const FORK_STATUSES = ['Included', 'Scheduled', 'Proposed', 'Considered', 'Declined'] as const;

// Layers
export const LAYERS = ['EL', 'CL'] as const;

export function passesFilters(eip: EIP, filters: EipSearchFilters): boolean {
  // If no filters are set, pass everything
  if (filters.forkName === 'all' && filters.forkStatus === 'all' && filters.layer === 'all') {
    return true;
  }

  // No fork relationships but filters require one
  if (eip.forkRelationships.length === 0) {
    return false;
  }

  // Get relevant forks based on fork name filter
  const relevantForks = filters.forkName !== 'all'
    ? eip.forkRelationships.filter(fr => fr.forkName.toLowerCase() === filters.forkName.toLowerCase())
    : eip.forkRelationships;

  if (relevantForks.length === 0 && filters.forkName !== 'all') {
    return false;
  }

  // Check fork status filter (most recent status in the relevant fork)
  if (filters.forkStatus !== 'all') {
    const hasStatus = relevantForks.some(fr => {
      const currentStatus = fr.statusHistory[fr.statusHistory.length - 1]?.status;
      return currentStatus === filters.forkStatus;
    });
    if (!hasStatus) return false;
  }

  // Check layer filter
  if (filters.layer !== 'all') {
    if (eip.layer !== filters.layer) return false;
  }

  return true;
}

export function calculateMatchScore(
  eip: EIP,
  queryTerms: string[]
): { score: number; matchedFields: string[] } {
  if (queryTerms.length === 0) {
    return { score: 1, matchedFields: [] }; // Return score of 1 for filter-only searches
  }

  let totalScore = 0;
  const matchedFields: string[] = [];

  // ID match (exact or partial)
  const idStr = eip.id.toString();
  if (queryTerms.some(term => idStr.includes(term))) {
    totalScore += SEARCH_WEIGHTS.id;
    matchedFields.push('id');
  }

  // Community acronym match
  if (matchesAlias(eip.id, queryTerms)) {
    totalScore += SEARCH_WEIGHTS.alias;
    matchedFields.push('alias');
  }

  // Title match
  const title = getLaymanTitle(eip).toLowerCase();
  if (queryTerms.some(term => title.includes(term))) {
    totalScore += SEARCH_WEIGHTS.title;
    matchedFields.push('title');
  }

  // Layman description match
  if (eip.laymanDescription) {
    const laymanDesc = eip.laymanDescription.toLowerCase();
    if (queryTerms.some(term => laymanDesc.includes(term))) {
      totalScore += SEARCH_WEIGHTS.laymanDescription;
      matchedFields.push('laymanDescription');
    }
  }

  // Description match
  if (eip.description) {
    const desc = eip.description.toLowerCase();
    if (queryTerms.some(term => desc.includes(term))) {
      totalScore += SEARCH_WEIGHTS.description;
      matchedFields.push('description');
    }
  }

  // Author match
  if (eip.author) {
    const author = eip.author.toLowerCase();
    if (queryTerms.some(term => author.includes(term))) {
      totalScore += SEARCH_WEIGHTS.author;
      matchedFields.push('author');
    }
  }

  // Benefits match
  if (eip.benefits?.length) {
    const benefits = eip.benefits.join(' ').toLowerCase();
    if (queryTerms.some(term => benefits.includes(term))) {
      totalScore += SEARCH_WEIGHTS.benefits;
      matchedFields.push('benefits');
    }
  }

  // North stars match
  if (eip.northStars?.length) {
    const northStars = eip.northStars.join(' ').toLowerCase();
    if (queryTerms.some(term => northStars.includes(term))) {
      totalScore += SEARCH_WEIGHTS.northStars;
      matchedFields.push('northStars');
    }
  }

  // FAQ match
  if (eip.faq?.length) {
    const faq = eip.faq
      .map((item) => `${item.question} ${item.answer}`)
      .join(' ')
      .toLowerCase();
    if (queryTerms.some(term => faq.includes(term))) {
      totalScore += SEARCH_WEIGHTS.faq;
      matchedFields.push('faq');
    }
  }

  return { score: totalScore, matchedFields };
}

export function getEipResultPath(result: EipSearchResult): string {
  const faqOnlyMatch = result.matchedFields.length === 1 && result.matchedFields[0] === 'faq';
  return faqOnlyMatch ? `/eips/${result.eip.id}?tab=faq` : `/eips/${result.eip.id}`;
}

export function searchEips(
  query: string,
  eips: EIP[],
  filters: EipSearchFilters
): EipSearchResult[] {
  const queryLower = query.toLowerCase().trim();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 0);

  return eips
    .map(eip => {
      // Step 1: Apply filters first
      if (!passesFilters(eip, filters)) {
        return null;
      }

      // Step 2: Calculate match score
      const { score, matchedFields } = calculateMatchScore(eip, queryTerms);

      // If query is empty but filters pass, include with minimal score
      if (queryTerms.length === 0) {
        return {
          eip,
          matchScore: 1,
          matchedFields: [],
        };
      }

      if (score === 0) return null;

      return {
        eip,
        matchScore: score,
        matchedFields,
      };
    })
    .filter((result): result is EipSearchResult => result !== null)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 50);
}

/**
 * Folds spec-index hits into metadata results: boost EIPs matched by both, append
 * spec-only hits that still pass the filters.
 */
export function mergeSpecResults(
  metadataResults: EipSearchResult[],
  specResults: { eipId: number; score: number }[],
  eipById: Map<number, EIP>,
  filters: EipSearchFilters
): EipSearchResult[] {
  const metaById = new Map(metadataResults.map((r) => [r.eip.id, r]));
  const merged = [...metadataResults];

  for (const spec of specResults) {
    const existing = metaById.get(spec.eipId);
    if (existing) {
      existing.matchScore += SEARCH_WEIGHTS.description * 0.5;
      if (!existing.matchedFields.includes('spec')) {
        existing.matchedFields.push('spec');
      }
    } else {
      const eip = eipById.get(spec.eipId);
      if (eip && passesFilters(eip, filters)) {
        merged.push({
          eip,
          matchScore: spec.score,
          matchedFields: ['spec'],
        });
      }
    }
  }

  merged.sort((a, b) => b.matchScore - a.matchScore);
  return merged.slice(0, 50);
}

/** Lifts EIP-only results into the shape the cross-section ranker consumes. */
export function toEipResults(results: EipSearchResult[], queryTerms: string[]): EipResult[] {
  return results.map((result) => ({
    kind: 'eip',
    eip: result.eip,
    matchedFields: result.matchedFields,
    score: result.matchScore,
    // Only a query that *is* the EIP number or its acronym names that EIP
    // outright; an EIP whose text merely mentions the number must not promote
    // the section.
    identity:
      queryTerms.includes(String(result.eip.id)) || result.matchedFields.includes('alias') ? 100 : 0,
    href: getEipResultPath(result),
  }));
}

export function getForkDisplayName(forkName: string): string {
  const displayMap: Record<string, string> = {
    'Hegota': 'Hegotá'
  };
  return displayMap[forkName] || forkName;
}

export function getFieldDisplayName(field: string): string {
  const displayMap: Record<string, string> = {
    'id': 'ID',
    'alias': 'name',
    'title': 'title',
    'laymanDescription': 'summary',
    'description': 'description',
    'author': 'author',
    'benefits': 'benefits',
    'northStars': 'north stars',
    'faq': 'FAQ',
    'spec': 'spec',
  };
  return displayMap[field] || field;
}

export function getEipStatusColor(status: string): string {
  switch (status) {
    case 'Included':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'Scheduled':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'Proposed':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'Considered':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'Declined':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  }
}
