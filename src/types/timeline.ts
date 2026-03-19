export interface TimelinePhase {
  id: string;
  title: string;
  dateRange: string;
  description: string;
  status: 'completed' | 'in-progress' | 'upcoming';
}

export interface ProcessPhase {
  id: string;
  title: string;
  duration: string;
  owner: string[];
  checklist: string[];
  deliverables: string[];
  notes?: string;
}

export interface DevnetDetail {
  name: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  date?: string;
  projectedDate?: string;
}

export interface TestnetDetail {
  name: string;
  status: 'completed' | 'in-progress' | 'upcoming' | 'deprecated';
  date?: string;
  projectedDate?: string;
}

export interface SubstepDetail {
  name: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  date?: string;
  projectedDate?: string;
}

export interface ForkPhaseProgress {
  phaseId: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  actualStartDate?: string;
  actualEndDate?: string;
  projectedDate?: string;
  progressNotes?: string;
  devnets?: DevnetDetail[];
  testnets?: TestnetDetail[];
  substeps?: SubstepDetail[];
}

export interface ForkProgress {
  forkName: string;
  phases: ForkPhaseProgress[];
}

export type MacroPhase = 'headliners' | 'scoping' | 'devnets' | 'testnets' | 'mainnet';

export interface MacroPhaseConfig {
  id: MacroPhase;
  label: string;
  description: string;
}