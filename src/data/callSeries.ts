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

// Badge colours per series, shared by the homepage and the calls index.
export const callTypeBadgeColors: Record<CallType, string> = {
  acdc: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  acde: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
  acdt: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  epbs: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  bal: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  focil: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  price: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  tli: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  pqts: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  rpc: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  zkevm: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300',
  etm: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  awd: 'bg-stone-100 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300',
  pqi: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  fcr: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  aa: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  p2p: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  ssz: 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300',
  ethproofs: 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300',
};

/** Falls back to the raw slug for a one-off, which carries its own `name`. */
export const getCallTypeName = (type: string): string =>
  callTypeNames[type as CallType] || type;
