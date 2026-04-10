export interface ComplexityAnchor {
  name: string;
  score: number;
  notes?: string;
}

export interface EipComplexity {
  eipNumber: number;
  totalScore: number;
  tier: 'Low' | 'Medium' | 'High';
  anchors: ComplexityAnchor[];
  assessmentUrl: string;
}

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
