import type { MacroPhase } from '../constants/timeline-phases';
import { FORK_PROGRESS_MAP } from '../constants/timeline-phases';
import type { ForkProgress } from '../constants/timeline-phases';
import type { NetworkUpgrade } from '../data/upgrades';

export function deriveMacroPhase(progress: ForkProgress): MacroPhase {
  const phaseStatus = (phaseId: string) =>
    progress.phases.find(p => p.phaseId === phaseId)?.status;

  const active = (s?: string) => s === 'completed' || s === 'in-progress';

  if (active(phaseStatus('mainnet-deployment'))) return 'mainnet';
  if (active(phaseStatus('public-testnets'))) return 'testnets';
  if (active(phaseStatus('development'))) return 'devnets';
  if (active(phaseStatus('eip-selection'))) return 'scoping';
  return 'headliners';
}

export function getMacroPhaseForUpgrade(upgrade: NetworkUpgrade): MacroPhase {
  if (upgrade.macroPhaseOverride) return upgrade.macroPhaseOverride;

  const progress = FORK_PROGRESS_MAP[upgrade.id];
  if (progress) return deriveMacroPhase(progress);

  return 'headliners';
}

export function getMacroPhaseSummary(upgrade: NetworkUpgrade, progress?: ForkProgress): string {
  if (upgrade.status === 'Live') {
    if (upgrade.highlights) return upgrade.highlights;
    return upgrade.tagline;
  }

  if (progress) {
    // Find the current active phase and return its progressNotes
    const activePhase = [...progress.phases].reverse().find(
      p => p.status === 'in-progress'
    );
    if (activePhase?.progressNotes) return activePhase.progressNotes;

    // If no in-progress phase, find the last completed one
    const lastCompleted = [...progress.phases].reverse().find(
      p => p.status === 'completed'
    );
    if (lastCompleted?.progressNotes) return lastCompleted.progressNotes;
  }

  // Fallback based on macro phase
  const phase = getMacroPhaseForUpgrade(upgrade);
  switch (phase) {
    case 'headliners': return 'Defining fork focus and evaluating headliner proposals.';
    case 'scoping': return 'Selecting non-headliner EIPs for inclusion.';
    case 'devnets': return 'Client teams implementing across devnets.';
    case 'testnets': return 'Testing on public testnets.';
    case 'mainnet': return 'Preparing for mainnet activation.';
  }
}
