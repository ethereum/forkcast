// Types for Butterfly API responses
// Documentation: https://github.com/raxhvl/butterfly/blob/main/docs/API.md

export interface ClientResult {
  passed: number;
  failed: number;
  pending: number;
  total: number;
  score: number;
}

export interface ClientTestResult {
  name: string;
  version?: string;
  githubRepo?: string;
  result: ClientResult;
}

export interface EipSummary {
  totalClients: number;
  clientsWithResults: number;
  totalTests: number;
  totalVariants: number;
  averageScore: number;
}

export interface EipAdoption {
  eip: string;
  spec: string;
  lastUpdated: string;
  summary: EipSummary;
  clients: ClientTestResult[];
}

export interface ForkSummary {
  totalEIPs: number;
  averageScore: number;
}

export interface ButterflyResponse {
  name: string;
  description: string;
  summary: ForkSummary;
  eips: EipAdoption[];
}

