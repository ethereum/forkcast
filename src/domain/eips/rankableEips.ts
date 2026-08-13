import { EIP } from '../../types/eip';
import { eipsData } from '../../data/eips';
import { getForkRelationship } from '../../utils/eip';

/** The fork whose proposals the rank page ranks. */
export const RANK_FORK = 'hegota';

const ACTIVE_STATUSES = new Set(['Proposed', 'Considered', 'Scheduled', 'Included']);

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
