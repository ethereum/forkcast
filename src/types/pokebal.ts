// Types for pokebal API responses
// Documentation: https://github.com/raxhvl/pokebal/blob/main/web/docs/API.md

export interface TestResult {
  passed?: number;
  failed?: number;
  total?: number;
  percentage?: number;
}

export interface ClientTestResult {
  name: string;
  version?: string;
  githubRepo?: string;
  result?: TestResult;
}

export interface PokebalResponse {
  eip: string;
  spec?: string;
  clients: ClientTestResult[];
  lastUpdated?: string;
}
