import type { ForkRelationship } from '../../types/eip';
import type { HeadlinerSelection } from '../../types/eip';
import { isSelectedHeadlinerId } from './headlinerSelection';

type StatusHistoryEntry = ForkRelationship['statusHistory'][number];
type DiscussionHistoryEntry = NonNullable<ForkRelationship['discussionHistory']>[number];
type HeadlinerHistoryEntry = NonNullable<ForkRelationship['headlinerHistory']>[number];
type CallReference = StatusHistoryEntry['call'];
type ForkStatus = StatusHistoryEntry['status'];

export interface EipTimelineStatusItem {
  type: 'status';
  status: ForkStatus;
  date: string | null;
  call: CallReference;
  timestamp?: number;
  isCurrentStatus: boolean;
}

export type EipTimelineEventKind =
  | 'discussion'
  | 'headlinerProposed'
  | 'headlinerPresented'
  | 'headlinerWithdrawn';

export interface EipTimelineEventItem {
  type: 'event';
  kind: EipTimelineEventKind;
  date: string | null;
  call?: DiscussionHistoryEntry['call'];
  link?: string;
  timestamp?: number;
}

export type EipTimelineItem = EipTimelineStatusItem | EipTimelineEventItem;

export interface EipTimelineForkGroup {
  forkName: string;
  champions?: ForkRelationship['champions'];
  currentStatus: ForkStatus;
  isHeadliner: boolean;
  items: EipTimelineItem[];
}

export interface BuildEipTimelineForkGroupOptions {
  eipId?: number;
  headlinerSelection?: HeadlinerSelection;
}

type MutableStatusEntry = {
  status: ForkStatus;
  date: string | null;
  call: CallReference;
  timestamp?: number;
};

const hasNamedChampion = (fork: ForkRelationship): boolean =>
  Boolean(fork.champions?.some((champion) => champion.name));

const buildEffectiveStatusHistory = (fork: ForkRelationship): MutableStatusEntry[] => {
  const statusHistory = fork.statusHistory.map((entry) => ({ ...entry }));
  const proposedEntries = statusHistory.filter((entry) => entry.status === 'Proposed');

  if (proposedEntries.length === 0 && hasNamedChampion(fork)) {
    return [{ status: 'Proposed', date: null, call: null }, ...statusHistory];
  }

  return statusHistory;
};

const shouldShowStatusItem = (item: EipTimelineStatusItem): boolean => {
  if (item.isCurrentStatus) return true;
  if (item.status === 'Proposed') return true;
  return Boolean(item.date || item.call);
};

const getItemDate = (item: EipTimelineItem): string | null => item.date ?? null;

const getReferenceKey = (entry: { call?: CallReference; date?: string | null }): string | null => {
  if (!entry.call || !entry.date) return null;
  return `${entry.call}|${entry.date}`;
};

const isDuplicateEvent = (
  event: EipTimelineEventItem,
  statusReferenceKeys: Set<string>,
): boolean => {
  if (event.kind !== 'discussion' && event.kind !== 'headlinerPresented') return false;
  const key = getReferenceKey(event);
  return key !== null && statusReferenceKeys.has(key);
};

const sortTimelineItems = (items: EipTimelineItem[]): EipTimelineItem[] =>
  [...items].sort((a, b) => {
    if (a.type === 'status' && a.isCurrentStatus) return -1;
    if (b.type === 'status' && b.isCurrentStatus) return 1;

    const aDate = getItemDate(a);
    const bDate = getItemDate(b);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

const headlinerEventKindByType = {
  proposed: 'headlinerProposed',
  presented: 'headlinerPresented',
  withdrawn: 'headlinerWithdrawn',
} satisfies Record<HeadlinerHistoryEntry['type'], EipTimelineEventKind>;

const getHeadlinerEventKind = (entry: HeadlinerHistoryEntry): EipTimelineEventKind =>
  headlinerEventKindByType[entry.type];

const buildHeadlinerEventItems = (
  headlinerHistory: HeadlinerHistoryEntry[] = [],
): EipTimelineEventItem[] =>
  headlinerHistory.map((entry) => ({
    type: 'event',
    kind: getHeadlinerEventKind(entry),
    date: entry.date ?? null,
    call: 'call' in entry ? entry.call : undefined,
    link: 'link' in entry ? entry.link : undefined,
    timestamp: 'timestamp' in entry ? entry.timestamp : undefined,
  }));

export function buildEipTimelineForkGroup(
  fork: ForkRelationship,
  options: BuildEipTimelineForkGroupOptions = {},
): EipTimelineForkGroup {
  const effectiveHistory = buildEffectiveStatusHistory(fork);
  const reversedHistory = [...effectiveHistory].reverse();
  const currentStatus = reversedHistory[0]?.status ?? 'Proposed';

  const statusItems: EipTimelineStatusItem[] = reversedHistory
    .map((entry, index) => ({
      type: 'status' as const,
      status: entry.status,
      date: entry.date,
      call: entry.call,
      timestamp: entry.timestamp,
      isCurrentStatus: index === 0,
    }))
    .filter(shouldShowStatusItem);

  const statusReferenceKeys = new Set(
    statusItems.map(getReferenceKey).filter((key): key is string => key !== null)
  );

  const eventItems: EipTimelineEventItem[] = [
    ...(fork.discussionHistory ?? []).map((discussion) => ({
      type: 'event' as const,
      kind: 'discussion' as const,
      date: discussion.date,
      call: discussion.call,
      timestamp: discussion.timestamp,
    })),
    ...buildHeadlinerEventItems(fork.headlinerHistory),
  ].filter((event) => !isDuplicateEvent(event, statusReferenceKeys));

  return {
    forkName: fork.forkName,
    champions: fork.champions,
    currentStatus,
    isHeadliner: options.eipId !== undefined &&
      isSelectedHeadlinerId(options.headlinerSelection, options.eipId),
    items: sortTimelineItems([...statusItems, ...eventItems]),
  };
}
