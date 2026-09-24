/**
 * What a call can resolve about a proposal while its slide is on screen. These are the
 * outcomes a scoping call actually reaches — a proposal moves forward, is dropped, or is
 * held for a later call. Anything finer (SFI, a stage the EIP already holds) is a
 * decision for the record rather than one taken against a slide.
 */
export type CallDecision = 'cfi' | 'deferred' | 'dfi';

/** Display order, running from the most positive outcome to the most negative. */
export const CALL_DECISIONS: readonly CallDecision[] = ['cfi', 'deferred', 'dfi'];

export const CALL_DECISION_LABEL: Record<CallDecision, string> = {
  cfi: 'CFI',
  deferred: 'Deferred',
  dfi: 'DFI',
};

/**
 * The key each decision is bound to while presenting. `f` stands in for "defer" because
 * `d` belongs to DFI, which is said far more often on a call.
 */
export const CALL_DECISION_KEY: Record<CallDecision, string> = {
  cfi: 'c',
  deferred: 'f',
  dfi: 'd',
};

const KEY_TO_DECISION = new Map(
  CALL_DECISIONS.map((decision) => [CALL_DECISION_KEY[decision], decision])
);

/** The decision a keypress stands for, or null for any other key. */
export const decisionForKey = (key: string): CallDecision | null =>
  KEY_TO_DECISION.get(key.toLowerCase()) ?? null;

/**
 * Enters and leaves the facilitator view. A bare `f` only, so find-in-page still reaches the
 * browser. It doubles as the deferral key, which never contends because the deck takes the
 * keyboard for itself while it is up.
 */
export const isFacilitatorHotkey = (event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}): boolean =>
  !event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'f';

/**
 * The outcome a proposal already carries into the call, for the two stages that are the
 * same resolutions a call reaches. Deferral has no stage of its own, and PFI is simply
 * where everything on the board starts, so neither maps to anything.
 */
export function decisionForStage(inclusionStage: string): CallDecision | null {
  if (inclusionStage === 'Considered for Inclusion') return 'cfi';
  if (inclusionStage === 'Declined for Inclusion') return 'dfi';
  return null;
}

export type CallDecisionMap = Record<number, CallDecision>;

const isCallDecision = (value: unknown): value is CallDecision =>
  typeof value === 'string' && (CALL_DECISIONS as readonly string[]).includes(value);

/** Per fork, so a call about one upgrade never inherits marks made about another. */
export const decisionsStorageKey = (fork: string): string =>
  `forkcast:call-decisions:${fork.toLowerCase()}`;

/**
 * Reads back a stored map, dropping any entry that isn't a numeric EIP id mapped to a
 * known decision. The store is restored mid-call, so a hand-edited or stale value has to
 * be ignored rather than throw.
 */
export function parseDecisions(raw: string | null): CallDecisionMap {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

  const result: CallDecisionMap = {};
  for (const [key, value] of Object.entries(parsed)) {
    const eipId = Number(key);
    if (Number.isInteger(eipId) && isCallDecision(value)) result[eipId] = value;
  }
  return result;
}

/** Setting the decision a proposal already carries clears it, so a misfire is undone with the same key. */
export function toggleDecision(
  decisions: CallDecisionMap,
  eipId: number,
  decision: CallDecision
): CallDecisionMap {
  const next = { ...decisions };
  if (next[eipId] === decision) delete next[eipId];
  else next[eipId] = decision;
  return next;
}

/**
 * The record a presenter takes away, headed for call notes or a chat message. Grouped by
 * outcome because that is what a reader wants — the list of what got CFI'd — and ordered
 * by EIP within a group so two calls about the same board produce comparable output. An
 * outcome nobody reached is left out rather than printed as an empty heading. Titles ride
 * along because a bare number would have to be looked up; which fork and which day it was
 * are already given by wherever this gets pasted.
 */
export function formatDecisions(
  decisions: CallDecisionMap,
  titleFor: (eipId: number) => string | undefined
): string {
  const ids = Object.keys(decisions)
    .map(Number)
    .sort((a, b) => a - b);

  return CALL_DECISIONS.flatMap((decision) => {
    const marked = ids.filter((eipId) => decisions[eipId] === decision);
    if (marked.length === 0) return [];
    const lines = marked.map(
      (eipId) => `- EIP-${eipId}: ${titleFor(eipId) ?? 'Untitled'}`
    );
    return [`${CALL_DECISION_LABEL[decision]}\n${lines.join('\n')}\n`];
  }).join('\n');
}
