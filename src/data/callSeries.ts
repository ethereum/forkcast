/**
 * Call series identity, with no call data behind it.
 *
 * Split out of `calls.ts` so a component that only needs to name a series —
 * `EipMentions`, say — doesn't pull the 300-entry call list into its bundle.
 * `calls.ts` re-exports both, so existing imports are unaffected.
 */
export type CallType = 'acdc' | 'acde' | 'acdt' | 'epbs' | 'bal' | 'focil' | 'price' | 'tli' | 'pqts' | 'rpc' | 'zkevm' | 'etm' | 'awd' | 'pqi' | 'fcr' | 'aa' | 'p2p' | 'ssz' | 'ethproofs' | 'pqcl' | 'eipip' | 'eipoh';

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
  pqcl: 'PQ-CL Breakout',
  eipip: 'EIPIP Meeting',
  eipoh: 'EIP Editing Office Hour',
};

/** Falls back to the raw slug for a one-off, which carries its own `name`. */
export const getCallTypeName = (type: string): string =>
  callTypeNames[type as CallType] || type;

/**
 * Series listed among upcoming calls but given no Forkcast pages or data: no
 * `/calls/{type}` scope and no watch page, so their cards link out to GitHub.
 * Their calls never enter `protocolCalls` (ethereum/pm holds no artifacts for
 * them), so any page would exist only while a call is upcoming and break once
 * it passes. Their YouTube links are never looked up, and `/api/calls.json`
 * leaves them out of its `series` map.
 */
const LISTING_ONLY_TYPES: ReadonlySet<CallType> = new Set<CallType>(['eipip', 'eipoh']);

export const isListingOnlyCallType = (type: string): boolean =>
  LISTING_ONLY_TYPES.has(type as CallType);
