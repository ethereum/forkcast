export type EipDevnetStatus = 'updated' | 'new' | 'new_optional' | 'optional' | null;
export type ClientSupportStatus =
  | 'supported'
  | 'not_supported'
  | 'in_progress'
  | 'unknown'
  | string;

export interface DevnetSpecEip {
  number: number;
  title: string;
  status: EipDevnetStatus;
  url: string;
}

export interface ClientSupportRow {
  eipNumber: number;
  label: string;
  support: Record<string, ClientSupportStatus>;
}

export interface ClientSupportMatrix {
  clients: string[];
  matrix: ClientSupportRow[];
}

export interface SpecReference {
  version: string;
  url: string;
}

export interface DevnetSpec {
  id: string;
  title: string;
  sourceUrl: string;
  scrapedAt: string;
  /** When set, this devnet reuses the spec of another devnet (by ID). */
  sameSpecAs?: string;
  announcements: string[];
  eips: DevnetSpecEip[];
  elClientSupport: ClientSupportMatrix;
  clClientSupport: ClientSupportMatrix;
  specReferences: {
    consensusSpecs: SpecReference | null;
    executionSpecs: SpecReference | null;
  };
}
