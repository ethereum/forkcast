import { useCallback, useEffect, useState } from 'react';
import {
  CallDecision,
  CallDecisionMap,
  decisionsStorageKey,
  parseDecisions,
  toggleDecision,
} from '../domain/prioritization/callDecisions';

interface UseCallDecisionsResult {
  decisions: CallDecisionMap;
  /** Applying the decision a proposal already carries clears it. */
  decide: (eipId: number, decision: CallDecision) => void;
  clear: () => void;
}

/**
 * Decisions taken against the slides of one fork's board. They are held on the machine
 * that took them: a call runs for hours and a stray refresh, an accidental Escape or a
 * crash partway through would otherwise lose everything logged so far.
 */
export function useCallDecisions(fork: string): UseCallDecisionsResult {
  const [decisions, setDecisions] = useState<CallDecisionMap>({});

  // Read after mount rather than in the initializer: the store is per fork, so switching
  // forks has to reload it, and one effect covers both cases.
  useEffect(() => {
    try {
      setDecisions(parseDecisions(localStorage.getItem(decisionsStorageKey(fork))));
    } catch {
      setDecisions({});
    }
  }, [fork]);

  /**
   * Writes through on the way to the new state. A separate effect keyed on `decisions`
   * would fire once with the previous fork's marks under the new fork's key.
   */
  const update = useCallback(
    (next: (prev: CallDecisionMap) => CallDecisionMap) => {
      setDecisions((prev) => {
        const value = next(prev);
        try {
          localStorage.setItem(decisionsStorageKey(fork), JSON.stringify(value));
        } catch {
          // Unwritable storage (private mode, quota) still leaves the decision on screen.
        }
        return value;
      });
    },
    [fork]
  );

  const decide = useCallback(
    (eipId: number, decision: CallDecision) =>
      update((prev) => toggleDecision(prev, eipId, decision)),
    [update]
  );

  const clear = useCallback(() => update(() => ({})), [update]);

  return { decisions, decide, clear };
}
