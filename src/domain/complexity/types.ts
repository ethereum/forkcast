export interface ComplexityAnchor {
  name: string;
  score: number;
  notes?: string;
}

/** The open pull request an assessment lives in while it is still under review. */
export interface ComplexityPullRequest {
  number: number;
  url: string;
  title: string;
  isDraft: boolean;
}

export interface EipComplexity {
  eipNumber: number;
  totalScore: number;
  tier: 'Low' | 'Medium' | 'High';
  anchors: ComplexityAnchor[];
  assessmentUrl: string;
  /** Which STEEL checklist the assessment was scored against. */
  checklistRevision: ChecklistRevision;
  /**
   * The tier the assessment file states, set only when it disagrees with the tier its own
   * score falls in. `tier` is always the computed one.
   */
  statedTier?: ComplexityTier;
  /** Set only when the assessment has not been merged to the STEEL main branch. */
  pullRequest?: ComplexityPullRequest;
}

export type ChecklistRevision = 1 | 2;

/**
 * Each checklist revision has its own anchor set and tier thresholds. Revision 2 scaled
 * revision 1's 10/20 thresholds by 84/72 so that tier membership stays stable as the anchor
 * set grew, which makes tiers comparable across revisions where raw scores are not.
 */
export const CHECKLIST_REVISIONS: Record<ChecklistRevision, {
  anchorCount: number;
  nominalMax: number;
  mediumFrom: number;
  highFrom: number;
}> = {
  1: { anchorCount: 24, nominalMax: 72, mediumFrom: 10, highFrom: 20 },
  2: { anchorCount: 28, nominalMax: 84, mediumFrom: 12, highFrom: 23 },
};

export type ComplexityTier = 'Low' | 'Medium' | 'High';

// The 23 STEEL complexity anchors
export const COMPLEXITY_ANCHORS = [
  'EVM Gas rule changes',
  'Blob gas accounting changes',
  'New EVM gas refund',
  'Patterns affecting pre-existing tests',
  'Transition-tool interface changes',
  'Cryptography',
  'Edge/boundary conditions',
  'Block syncing changes',
  'Engine API changes',
  'Added system contracts',
  'Modified system contracts',
  'Added opcodes',
  'Modified opcodes',
  'Added precompiles',
  'Modified precompiles',
  'Encoding changes (RLP/SSZ)',
  'New transaction types',
  'New or modified transaction validity mechanisms',
  'New block/header fields',
  'New fork activation mechanism',
  'Performance risks',
  'Security risks',
  'Cross-EIP interactions',
] as const;
