import { EIP } from '../../types/eip';
import { eipsData } from '../../data/eips';
import { getForkRelationship } from '../../utils/eip';

/** The fork whose proposals the rank page ranks. */
export const RANK_FORK = 'hegota';

/**
 * Only EIPs whose inclusion is still undecided. Once an EIP is SFI'd
 * (`Scheduled`) it is locked into the fork and there is nothing left to rank —
 * that applies to headliners (EIP-7805) and non-headliners (EIP-8141) alike.
 */
const ACTIVE_STATUSES = new Set(['Proposed', 'Considered']);

/**
 * The proposals that make up the rank page's board: EIPs still in play for the
 * fork, minus the headliners (which are chosen separately, not ranked).
 */
export const getRankableEips = (eips: EIP[] = eipsData): EIP[] =>
  eips.filter(eip => {
    const relationship = getForkRelationship(eip, RANK_FORK);
    if (!relationship || relationship.isHeadliner) return false;
    const history = relationship.statusHistory;
    return ACTIVE_STATUSES.has(history[history.length - 1]?.status);
  });
