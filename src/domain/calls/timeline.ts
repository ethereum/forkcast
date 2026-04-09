import { type Call } from '../../data/calls';
import { type TimelineEvent } from '../../data/events';
import { getUpcomingCallBucketDate, type UpcomingCall } from './upcomingCalls';
import { formatDateInTimeZone } from '../../utils/localDate';

export type TimelineItem = Call | TimelineEvent | UpcomingCall;
export type DateSectionId = 'today' | 'future' | 'previous';
export interface TimelineMonthGroup {
  monthLabel: string;
  items: TimelineItem[];
}

export interface TimelineDateSection {
  id: DateSectionId;
  count: number;
  monthGroups: TimelineMonthGroup[];
  showLoadingPlaceholder: boolean;
}

export const isEventItem = (item: TimelineItem): item is TimelineEvent => item.type === 'event';
export const isUpcomingCallItem = (item: TimelineItem): item is UpcomingCall => 'githubUrl' in item;

const asValidDate = (date: Date): Date | null => (
  Number.isNaN(date.getTime()) ? null : date
);

const getExplicitEventDateTime = (item: TimelineItem): Date | null => {
  if (isEventItem(item) && item.datetime) {
    return asValidDate(new Date(item.datetime.replace(' ', 'T') + 'Z'));
  }

  return null;
};

export const getTimestampedItemDateTime = (item: TimelineItem): Date | null => {
  const eventDateTime = getExplicitEventDateTime(item);
  if (eventDateTime) return eventDateTime;

  if (isUpcomingCallItem(item)) {
    return item.startTimeUtc ? asValidDate(new Date(item.startTimeUtc)) : null;
  }

  return null;
};

// Use the stored date for rendered text and month grouping.
export const getItemCalendarDate = (item: TimelineItem): string => item.date;

// Timestamped items bucket by the viewer's local day; rendered dates stay on the stored calendar day.
export const getItemBucketDate = (item: TimelineItem, timeZone?: string): string => {
  if (isUpcomingCallItem(item)) {
    return getUpcomingCallBucketDate(item, timeZone);
  }

  const itemDateTime = getTimestampedItemDateTime(item);
  if (!itemDateTime) return item.date;

  return formatDateInTimeZone(itemDateTime, timeZone);
};

// Day sections are intentional: same-day timed items stay in Today until the viewer's local tomorrow.
export const getItemDateSection = (item: TimelineItem, todayDateString: string, timeZone?: string): DateSectionId => {
  const bucketDate = getItemBucketDate(item, timeZone);

  if (bucketDate === todayDateString) return 'today';

  return bucketDate > todayDateString ? 'future' : 'previous';
};

const getMonthLabel = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
};

const sortItemsForSection = (items: TimelineItem[], sectionId: DateSectionId, timeZone?: string): TimelineItem[] =>
  [...items].sort((a, b) => {
    const dateCompare = getItemBucketDate(a, timeZone).localeCompare(getItemBucketDate(b, timeZone));
    if (dateCompare !== 0) {
      return sectionId === 'previous' ? -dateCompare : dateCompare;
    }

    const aDateTime = getTimestampedItemDateTime(a);
    const bDateTime = getTimestampedItemDateTime(b);
    if (aDateTime && bDateTime) {
      return sectionId === 'previous'
        ? bDateTime.getTime() - aDateTime.getTime()
        : aDateTime.getTime() - bDateTime.getTime();
    }

    return 0;
  });

const groupItemsByMonth = (items: TimelineItem[]): TimelineMonthGroup[] => {
  const groups: TimelineMonthGroup[] = [];

  for (const item of items) {
    const monthLabel = getMonthLabel(getItemCalendarDate(item));
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || lastGroup.monthLabel !== monthLabel) {
      groups.push({ monthLabel, items: [item] });
      continue;
    }

    lastGroup.items.push(item);
  }

  return groups;
};

export const buildTimelineDateSections = (
  items: TimelineItem[],
  todayDateString: string,
  upcomingCallsLoading: boolean,
  timeZone?: string
): TimelineDateSection[] =>
  (['today', 'future', 'previous'] as const)
    .map((sectionId) => {
      const sectionItems = sortItemsForSection(
        items.filter((item) => getItemDateSection(item, todayDateString, timeZone) === sectionId),
        sectionId,
        timeZone
      );
      const showLoadingPlaceholder = (sectionId === 'today' || sectionId === 'future') && upcomingCallsLoading;

      return {
        id: sectionId,
        count: sectionItems.length,
        monthGroups: groupItemsByMonth(sectionItems),
        showLoadingPlaceholder
      };
    })
    .filter((section) => section.count > 0 || section.showLoadingPlaceholder);

export const getTimelineItemKey = (item: TimelineItem): string => {
  if (isEventItem(item)) {
    return `event-${item.date}-${item.title}`;
  }

  if (isUpcomingCallItem(item)) {
    return `upcoming-${item.type}-${item.number}`;
  }

  return item.path;
};
