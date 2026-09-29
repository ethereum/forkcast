/**
 * Call series identity, with no call data behind it.
 *
 * Split out of `calls.ts` so a component that only needs to name a series —
 * `EipMentions`, say — doesn't pull the 300-entry call list into its bundle.
 * `calls.ts` re-exports both, so existing imports are unaffected.
 */
export type CallType = 'acdc' | 'acde' | 'acdt' | 'epbs' | 'bal' | 'focil' | 'price' | 'tli' | 'pqts' | 'rpc' | 'zkevm' | 'etm' | 'awd' | 'pqi' | 'fcr' | 'aa' | 'p2p' | 'ssz' | 'ethproofs';

// Full names for call types (used in tooltips)
export const callTypeNames: Record<CallType, string> = {
  acdc: 'AllCoreDevs - Consensus',
  acde: 'AllCoreDevs - Execution',
  acdt: 'AllCoreDevs - Testing',
  epbs: 'ePBS Breakout',
  bal: 'BAL Breakout',
  focil: 'FOCIL Breakout',
  price: 'Glamsterdam Repricings',
  tli: 'Trustless Log Index',
  pqts: 'Post Quantum Transaction Signatures',
  rpc: 'RPC Standards',
  zkevm: 'L1-zkEVM Breakout',
  etm: 'Encrypt The Mempool',
  awd: 'AllWalletDevs',
  pqi: 'PQ Interop',
  fcr: 'Fast Confirmation Rule',
  aa: 'Frame Transaction Breakout',
  p2p: 'P2P Networking',
  ssz: 'SSZ Engine API',
  ethproofs: 'Ethproofs',
};

/** Falls back to the raw slug for a one-off, which carries its own `name`. */
export const getCallTypeName = (type: string): string =>
  callTypeNames[type as CallType] || type;
