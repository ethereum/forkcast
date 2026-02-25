import generatedCalls from './protocol-calls.generated.json';

export type CallType = 'acdc' | 'acde' | 'acdt' | 'epbs' | 'bal' | 'focil' | 'price' | 'tli' | 'pqts' | 'rpc' | 'zkevm' | 'etm' | 'awd' | 'pqi';

export interface Call {
  type: CallType;
  date: string;
  number: string;
  path: string;
}

// Full names for call types (used in tooltips)
export const callTypeNames: Record<CallType, string> = {
  acdc: 'All Core Devs - Consensus',
  acde: 'All Core Devs - Execution',
  acdt: 'All Core Devs - Testing',
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
};

export const protocolCalls: Call[] = generatedCalls as Call[];

// Helper to get recent calls
export const getRecentCalls = (limit: number = 5): Call[] => {
  return [...protocolCalls]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
};

// EIP <-> call type associations
export const eipCallTypes: Record<number, CallType> = {
  7732: 'epbs',
  7928: 'bal',
  7805: 'focil',
};

// Get previous and next calls for a given type
export const getCallNavigation = (type: CallType): { previous: Call | null; next: Call | null } => {
  const today = new Date().toISOString().split('T')[0];
  const calls = protocolCalls
    .filter(c => c.type === type)
    .sort((a, b) => a.date.localeCompare(b.date));

  const pastCalls = calls.filter(c => c.date <= today);
  const futureCalls = calls.filter(c => c.date > today);

  return {
    previous: pastCalls.length > 0 ? pastCalls[pastCalls.length - 1] : null,
    next: futureCalls.length > 0 ? futureCalls[0] : null,
  };
};