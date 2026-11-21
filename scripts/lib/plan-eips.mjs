import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Read the EIP source files directly. `src/data/eips.json` is a gitignored
 * build output, so it doesn't exist in the bot workflows that need this.
 * Throws rather than returning an empty list, so a missing dataset can't pass
 * for "nothing in scope".
 */
export function loadEips(eipsDir) {
  const files = readdirSync(eipsDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) throw new Error(`No EIP JSON files found in ${eipsDir}`);
  return files
    .map((f) => JSON.parse(readFileSync(join(eipsDir, f), 'utf-8')))
    .filter((eip) => eip.status !== 'Moved');
}

const latestStatus = (fr) => fr.statusHistory?.[fr.statusHistory.length - 1]?.status;

/**
 * EIPs still awaiting a fork decision: PFI or CFI in some fork, or a headliner
 * candidate with no PFI/CFI status yet. Matches what /agenda lists (see
 * CallPlanPage), which is the only place the threads are shown. Status-based,
 * so it follows whichever fork is open for proposals without naming one.
 */
export function selectInScopeEips(eips, layerFilter = null) {
  const inScope = [];
  for (const eip of eips) {
    if (layerFilter && eip.layer && eip.layer !== layerFilter) continue;

    for (const fr of eip.forkRelationships || []) {
      const status = latestStatus(fr);
      const isOpen = status === 'Proposed' || status === 'Considered';
      const isUndecidedCandidate =
        !fr.statusHistory?.length && (fr.isHeadliner || fr.wasHeadlinerCandidate);
      if (!isOpen && !isUndecidedCandidate) continue;

      inScope.push({
        id: eip.id,
        title: (eip.title || '').replace(/^EIP-\d+:\s*/, ''),
        fork: fr.forkName,
        stage: status === 'Considered' ? 'CFI' : status === 'Proposed' ? 'PFI' : 'Candidate',
      });
      break;
    }
  }
  return inScope;
}
