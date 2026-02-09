export type ChangeStatus = 'new' | 'updated' | 'unchanged';

export type ImplementationStatus = 'done' | 'in-progress' | 'not-started' | 'unknown';

export interface DevnetSpecEip {
  id: number;
  title: string;
  summary: string;
  changeStatus: ChangeStatus;
  lastCommitSha?: string;
}

export interface ImplementationRow {
  eipId: number;
  clients: Record<string, ImplementationStatus>;
}

export interface DevnetSpecPR {
  repo: string;
  number: number;
  description: string;
  eipId?: number;
  status?: 'open' | 'merged' | 'closed' | 'draft';
  title?: string;
  headSha?: string;
}

export interface DevnetSpecVersions {
  consensusSpecs?: string;
  executionSpecs?: string;
  engineApi?: string;
}

export interface DevnetSpec {
  id: string;
  upgrade: string;
  headliner: string;
  version: number;
  launchDate?: string;
  lastUpdated: string;
  notes?: string[];
  specVersions: DevnetSpecVersions;
  eips: DevnetSpecEip[];
  implementations: {
    el: ImplementationRow[];
    cl: ImplementationRow[];
  };
  prs: DevnetSpecPR[];
}
