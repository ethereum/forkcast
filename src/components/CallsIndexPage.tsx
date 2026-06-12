import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from './navigation';
import { protocolCalls, isOneOffCall } from '../data/calls';
import { timelineEvents } from '../data/events';
import { upcomingCalls } from '../domain/calls/upcomingCalls';
import GlobalCallSearch from './GlobalCallSearch';
import { isSearchHotkey } from './search/searchShortcuts';
import { buildTimelineDateSections } from '../domain/calls/timeline';
import { getTodayDateString } from '../utils/localDate';
import { CallsIndexTimeline } from './calls-index/CallsIndexTimeline';
import { onOpenCallSearch } from '../domain/calls/callSearch';

const ACD_TYPES = ['acdc', 'acde', 'acdt'];

const matchesSelectedBreakoutType = (callType: string, selectedBreakoutType: string): boolean => {
  if (!selectedBreakoutType) return true;
  if (selectedBreakoutType === 'one-off') return isOneOffCall(callType);
  return callType === selectedBreakoutType;
};

interface CallsIndexPageProps {
  /** Concrete call-type scope from the /calls/[type] route, e.g. "acde". */
  scope?: string;
}

const CallsIndexPage: React.FC<CallsIndexPageProps> = ({ scope }) => {
  const [searchParams] = useSearchParams();
  const selectedFilter = scope ?? (searchParams.get('filter') || 'all');
  const selectedBreakoutType = scope ? '' : (searchParams.get('breakoutType') || '');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSearchHotkey(e)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => onOpenCallSearch(() => setSearchOpen(true)), []);

  const filteredCalls = useMemo(() => selectedFilter === 'all'
    ? protocolCalls
    : selectedFilter === 'acd'
    ? protocolCalls.filter(call => ACD_TYPES.includes(call.type))
    : selectedFilter === 'breakouts'
    ? protocolCalls.filter(call => !ACD_TYPES.includes(call.type) && matchesSelectedBreakoutType(call.type, selectedBreakoutType))
    : protocolCalls.filter(call => call.type === selectedFilter),
  [selectedFilter, selectedBreakoutType]);

  const filteredUpcomingCalls = useMemo(() => selectedFilter === 'all'
    ? upcomingCalls
    : selectedFilter === 'acd'
    ? upcomingCalls.filter(call => ACD_TYPES.includes(call.type))
    : selectedFilter === 'breakouts'
    ? upcomingCalls.filter(call => !ACD_TYPES.includes(call.type) && matchesSelectedBreakoutType(call.type, selectedBreakoutType))
    : upcomingCalls.filter(call => call.type === selectedFilter),
  [selectedFilter, selectedBreakoutType]);

  const timelineItems = useMemo(() => {
    return [
      ...filteredCalls,
      ...filteredUpcomingCalls,
      ...timelineEvents
    ];
  }, [filteredCalls, filteredUpcomingCalls]);

  const viewerTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const todayDateString = getTodayDateString(new Date(), viewerTimeZone);

  const dateSections = useMemo(
    () => buildTimelineDateSections(timelineItems, todayDateString, false, viewerTimeZone),
    [timelineItems, todayDateString, viewerTimeZone]
  );

  return (
    <>
      <CallsIndexTimeline sections={dateSections} />

      <GlobalCallSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
};

export default CallsIndexPage;
