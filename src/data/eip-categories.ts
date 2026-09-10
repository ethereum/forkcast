// Thematic categories for the proposals shown on the rank page. Grouping is by
// what a proposal is *for*, not by its dependency graph.
//
// The cuts follow the themes in the Ethlabs Hegotá view
// (https://ethlabs.org/writings/hegota-view.html), which is the most worked-out
// public grouping of this fork's proposals. The *names* here are deliberately
// not theirs: theirs carry the recommendation ("FOCIL: strengthen
// censorship-resistance"), and Forkcast's own chrome has to stay neutral, so
// each is reduced to the mechanism or area it covers.
//
// Categories are declared in display order. The page groups by layer first, so a
// category shows up under every layer its EIPs belong to. EIPs listed here that
// are not up for ranking are ignored, and EIPs in no category at all fall into a
// trailing "Uncategorized".

/** A finer cut within a category, where the source draws one. */
export interface EipSubcategory {
  name: string;
  /** Member EIPs, in display order. */
  eips: number[];
}

export interface EipCategory {
  /** Slug, stable across renames of `name`. */
  id: string;
  name: string;
  /** Member EIPs, in display order. Set unless the category has subcategories. */
  eips?: number[];
  /** Set instead of `eips` when the category is worth reading in parts. */
  subcategories?: EipSubcategory[];
}

export const eipCategories: EipCategory[] = [
  {
    id: 'focil',
    name: 'FOCIL',
    eips: [7805]
  },
  {
    id: 'quick-slots',
    name: 'Quick Slots',
    eips: [8198]
  },
  {
    id: 'account-abstraction',
    name: 'Account Abstraction',
    subcategories: [
      {
        // 8141 is the transaction type; the rest amend or build on its frames.
        name: 'Frame Transactions',
        eips: [8141, 7906, 8250, 8272, 8369]
      },
      {
        name: 'Code Reuse',
        eips: [7819, 8058, 8298]
      },
      {
        name: 'EOA Migration',
        eips: [7851, 8151]
      },
      {
        name: 'Post-Quantum Signatures',
        eips: [8355]
      }
    ]
  },
  {
    id: 'performance-engineering',
    name: 'Performance Engineering',
    subcategories: [
      {
        // Put to ACD as a pair, so they are read as one decision.
        name: 'Data Repricing Bundle',
        eips: [8131, 8279]
      },
      {
        name: 'Other Performance EIPs',
        eips: [7862, 8146, 8334, 8341, 8368, 8372]
      }
    ]
  },

  // --- Ethlabs' "Other EIPs", which their view leaves as flat peers ---
  {
    id: 'issuance',
    name: 'Issuance',
    eips: [8363]
  },
  {
    id: 'staking-features',
    name: 'Staking Features',
    eips: [7716, 8015, 8148, 8205, 8237, 8333, 8359, 8375]
  },
  {
    id: 'post-quantum-prep',
    name: 'Post-Quantum Preparation',
    eips: [8321, 8365, 8367]
  },
  {
    id: 'zkevm-prep',
    name: 'zkEVM Preparation',
    eips: [7666, 7709, 8025, 8200, 8268]
  },
  {
    id: 'evm-features',
    name: 'EVM Features',
    eips: [2488, 4758, 5920, 7645, 7686, 7923, 7979, 8163, 8173, 8182, 8219, 8253]
  },
  {
    id: 'evm-pricing',
    name: 'EVM Pricing',
    eips: [3298, 7973, 8115, 8188, 8358, 8374]
  },
  {
    id: 'execution-data',
    name: 'Execution Data & Indexing',
    eips: [7668, 7807, 8116, 8304]
  },
  {
    id: 'networking',
    name: 'Networking',
    // 8379 is not in the Ethlabs view; it sits with 8383, the other retention EIP.
    eips: [8077, 8094, 8142, 8243, 8371, 8379, 8383]
  }
];

/**
 * Running order for the Client Priority board, walking the biggest themes first.
 * Shared by the grouped table and the presentation, so a reader who saw the deck
 * finds the table in the same shape. A group may merge several categories, which
 * then read as its subheads.
 */
export interface DisplayGroup {
  id: string;
  name: string;
  /** Categories to draw from, in the order they should appear in the group. */
  categoryIds: string[];
}

// Categories absent from this order still get a group of their own, after the
// listed ones — a newly filed category must not vanish from the board.
export const displayGroups: DisplayGroup[] = [
  { id: 'group-account-abstraction', name: 'Account Abstraction', categoryIds: ['account-abstraction'] },
  { id: 'group-evm-features', name: 'EVM Features', categoryIds: ['evm-features'] },
  { id: 'group-evm-pricing', name: 'EVM Pricing', categoryIds: ['evm-pricing', 'zkevm-prep'] },
  { id: 'group-performance', name: 'Performance Engineering', categoryIds: ['performance-engineering'] },
  { id: 'group-misc', name: 'Misc', categoryIds: ['execution-data', 'networking'] }
];

/** Every EIP a category claims, whether it declares them flat or in parts. */
export const categoryEips = (category: EipCategory): number[] =>
  category.eips ?? category.subcategories?.flatMap(sub => sub.eips) ?? [];

// Deliberately not "Other": the rank page already uses that name for the
// section holding EIPs with no layer.
/** Bucket for EIPs that have not been categorized yet. */
export const UNCATEGORIZED = 'Uncategorized';
