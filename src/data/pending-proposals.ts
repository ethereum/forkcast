// Pending proposals that don't have EIP numbers yet
// These are forum discussions that may become EIPs

export interface PendingProposal {
  id: string;
  title: string;
  description: string;
  forumLink: string;
  layer: 'EL' | 'CL';
  champions: {
    name: string;
    discord?: string;
  }[];
  forkName: string;
}

export const pendingProposals: PendingProposal[] = [
  {
    id: 'lucid-encrypted-mempool',
    title: 'LUCID Encrypted Mempool',
    description: 'Gives users cryptographic protection against front-running and sandwich attacks without relying on centralized private mempools. Validators regain control over block inclusion, and the public mempool becomes viable again for institutional users requiring guaranteed transaction integrity.',
    forumLink: 'https://ethereum-magicians.org/t/hegota-headliner-lucid-encrypted-mempool/27658',
    layer: 'EL',
    champions: [],
    forkName: 'Hegota'
  },
  {
    id: 'partial-reconstruction-2d-peerdas',
    title: 'Partial Reconstruction and 2D PeerDAS',
    description: 'Enables nodes to participate in data availability sampling without requiring supernode bandwidth. Node operators benefit from lower storage and bandwidth requirements, validators gain resilience against data withholding attacks, and L2s get more reliable blob availability.',
    forumLink: 'https://ethereum-magicians.org/t/hegota-headliner-partial-reconstruction-and-2d-peerdas/27652',
    layer: 'CL',
    champions: [],
    forkName: 'Hegota'
  }
];

export const getPendingProposalsForFork = (forkName: string): PendingProposal[] => {
  return pendingProposals.filter(p => p.forkName.toLowerCase() === forkName.toLowerCase());
};
