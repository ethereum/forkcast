// Thematic categories for the proposals shown on the rank page. Grouping is by
// what a proposal is *for*, not by its dependency graph.
//
// Categories are declared in display order. The page groups by layer first, so a
// category shows up under every layer its EIPs belong to. EIPs listed here that
// are not up for ranking are ignored, and EIPs in no category at all fall into a
// trailing "Other".

export interface EipCategory {
  /** Slug, stable across renames of `name`. */
  id: string;
  name: string;
  /** Member EIPs, in display order. */
  eips: number[];
}

export const eipCategories: EipCategory[] = [
  // --- Execution layer ---
  {
    id: 'frame-transactions',
    name: 'Frame Transactions',
    // 8141 is the transaction type; the rest amend or build on its frames.
    eips: [8141, 7906, 8250, 8272]
  },
  {
    id: 'account-abstraction',
    name: 'Account Abstraction & Delegation',
    eips: [7645, 7819, 7851, 8151, 8298]
  },
  {
    id: 'evm-features',
    name: 'EVM Features',
    eips: [5920, 7979, 8163, 8173]
  },
  {
    id: 'repricing',
    name: 'Repricing',
    eips: [7686, 7709, 7923, 7971, 7973, 8058, 8131, 8279]
  },
  {
    id: 'precompiles-cryptography',
    name: 'Precompiles & Cryptography',
    eips: [7666, 8030, 8200]
  },
  {
    id: 'block-state-data',
    name: 'Block & State Data',
    eips: [7807, 8115, 8116, 8188, 8268, 8304]
  },
  {
    id: 'privacy',
    name: 'Privacy',
    eips: [8182]
  },

  // --- Consensus layer ---
  {
    id: 'beacon-block-data',
    name: 'Beacon Block Data',
    eips: [8237, 8341, 8359]
  },
  {
    id: 'block-propagation',
    name: 'Block Propagation & Validation',
    eips: [8146]
  },
  {
    id: 'attestations',
    name: 'Attestations',
    eips: [8243, 8334]
  },
  {
    id: 'consensus-fork-choice',
    name: 'Consensus & Fork Choice',
    eips: [8198, 8321, 8333]
  },
  {
    id: 'staking-features',
    name: 'Staking Features',
    eips: [8148, 8205, 8365, 8367]
  },
  {
    id: 'rewards-penalties',
    name: 'Rewards & Penalties',
    eips: [7716, 8363]
  },
  {
    id: 'data-availability',
    name: 'Data Availability & Proofs',
    eips: [8025, 8142, 8371]
  },
  {
    id: 'censorship-resistance',
    name: 'Censorship Resistance',
    eips: [8369]
  },

  // --- Spans both layers, so these are declared last and render last everywhere ---
  {
    id: 'state-transition',
    name: 'State Transition',
    eips: [8253, 7862]
  },
  {
    id: 'cleanup-deprecations',
    name: 'Cleanup & Deprecations',
    eips: [2488, 4758, 7668, 8015]
  }
];

/** Bucket for EIPs that have not been categorized yet. */
export const UNCATEGORIZED = 'Other';
