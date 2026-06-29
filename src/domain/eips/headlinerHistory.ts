import type { ForkRelationship, ProtocolCallReference } from '../../types/eip';

export type HeadlinerHistoryEntry = NonNullable<ForkRelationship['headlinerHistory']>[number];
export type HeadlinerCandidacyStateEntry = Extract<HeadlinerHistoryEntry, { type: 'proposed' | 'withdrawn' }>;
export type HeadlinerProposalEntry = Extract<HeadlinerHistoryEntry, { type: 'proposed' }>;
export type HeadlinerCallEntry = Extract<HeadlinerHistoryEntry, { call?: ProtocolCallReference }> & {
  call: ProtocolCallReference;
};

export const getHeadlinerHistory = (fork?: Pick<ForkRelationship, 'headlinerHistory'>): HeadlinerHistoryEntry[] =>
  fork?.headlinerHistory ?? [];

export const hasHeadlinerHistory = (fork?: Pick<ForkRelationship, 'headlinerHistory'>): boolean =>
  getHeadlinerHistory(fork).length > 0;

export const isHeadlinerCandidacyState = (entry: HeadlinerHistoryEntry): entry is HeadlinerCandidacyStateEntry =>
  entry.type === 'proposed' || entry.type === 'withdrawn';

export const getCurrentHeadlinerCandidacyState = (
  fork?: Pick<ForkRelationship, 'headlinerHistory'>,
): HeadlinerCandidacyStateEntry | undefined =>
  [...getHeadlinerHistory(fork)].reverse().find(isHeadlinerCandidacyState);

export const hasActiveHeadlinerCandidacy = (fork?: Pick<ForkRelationship, 'headlinerHistory'>): boolean =>
  getCurrentHeadlinerCandidacyState(fork)?.type === 'proposed';

export const getHeadlinerProposal = (
  fork?: Pick<ForkRelationship, 'headlinerHistory'>,
): HeadlinerProposalEntry | undefined =>
  getHeadlinerHistory(fork).find((entry): entry is HeadlinerProposalEntry =>
    entry.type === 'proposed'
  );

export const hasHeadlinerCall = (entry: HeadlinerHistoryEntry): entry is HeadlinerCallEntry =>
  'call' in entry && Boolean(entry.call);

export const getLatestHeadlinerCall = (
  fork?: Pick<ForkRelationship, 'headlinerHistory'>,
): HeadlinerCallEntry | undefined =>
  [...getHeadlinerHistory(fork)].reverse().find(hasHeadlinerCall);
