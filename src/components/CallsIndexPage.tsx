import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { protocolCalls, callTypeNames, isOneOffCall, type CallType } from '../data/calls';
import { timelineEvents } from '../data/events';
import { fetchUpcomingCalls, type UpcomingCall } from '../domain/calls/upcomingCalls';
import GlobalCallSearch from './GlobalCallSearch';
import { SearchTriggerButton } from './search/SearchUi';
import { isSearchHotkey } from './search/searchShortcuts';
import { buildTimelineDateSections } from '../domain/calls/timeline';
import { getTodayDateString } from '../utils/localDate';
import { CallsIndexFilters } from './calls-index/CallsIndexFilters';
import { CallsIndexTimeline } from './calls-index/CallsIndexTimeline';

const ACD_TYPES = ['acdc', 'acde', 'acdt'];

const matchesSelectedBreakoutType = (callType: string, selectedBreakoutType: string): boolean => {
  if (!selectedBreakoutType) return true;
  if (selectedBreakoutType === 'one-off') return isOneOffCall(callType);
  return callType === selectedBreakoutType;
};

const CallsIndexPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFilter = searchParams.get('filter') || 'all';
  const selectedBreakoutType = searchParams.get('breakoutType') || '';
  const [upcomingCalls, setUpcomingCalls] = useState<UpcomingCall[]>([]);
  const [upcomingCallsLoading, setUpcomingCallsLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [breakoutDropdownOpen, setBreakoutDropdownOpen] = useState(false);
  const breakoutDropdownRef = useRef<HTMLDivElement>(null);

  const updateSearchParams = (update: (next: URLSearchParams) => void) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      update(next);
      return next;
    });
  };

  useEffect(() => {
    const loadUpcomingCalls = async () => {
      try {
        const upcoming = await fetchUpcomingCalls();
        setUpcomingCalls(upcoming);
      } catch (error) {
        console.error('Failed to load upcoming calls:', error);
      } finally {
        setUpcomingCallsLoading(false);
      }
    };

    loadUpcomingCalls();
  }, []);

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

  useEffect(() => {
    if (selectedFilter === 'breakouts') {
      setBreakoutDropdownOpen(true);
    }
  }, [selectedFilter]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (breakoutDropdownRef.current && !breakoutDropdownRef.current.contains(e.target as Node)) {
        setBreakoutDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const breakoutTypes = useMemo(() => Array.from(new Set([
    ...protocolCalls.filter(call => !ACD_TYPES.includes(call.type) && !isOneOffCall(call.type)).map(call => call.type),
    ...upcomingCalls.filter(call => !ACD_TYPES.includes(call.type) && !isOneOffCall(call.type)).map(call => call.type),
  ])).sort((a, b) => (callTypeNames[a as CallType] || a).localeCompare(callTypeNames[b as CallType] || b)), [upcomingCalls]);

  const hasOneOffCalls = useMemo(() => protocolCalls.some(call => isOneOffCall(call.type)), []);

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
  [upcomingCalls, selectedFilter, selectedBreakoutType]);

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
    () => buildTimelineDateSections(timelineItems, todayDateString, upcomingCallsLoading, viewerTimeZone),
    [timelineItems, todayDateString, upcomingCallsLoading, viewerTimeZone]
  );

  const breakoutLabel = selectedBreakoutType === 'one-off'
    ? 'One-Off Calls'
    : selectedBreakoutType
    ? (callTypeNames[selectedBreakoutType as CallType] || selectedBreakoutType.toUpperCase())
    : 'All Breakouts';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Protocol Calendar</h1>
              <a
                href="https://calendar.google.com/calendar/embed?src=c_upaofong8mgrmrkegn7ic7hk5s%40group.calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Full calendar ↗
              </a>
            </div>
            <SearchTriggerButton
              onOpen={() => setSearchOpen(true)}
              placeholder="Search calls..."
              ariaLabel="Search calls"
            />
          </div>
          <CallsIndexFilters
            selectedFilter={selectedFilter}
            selectedBreakoutType={selectedBreakoutType}
            breakoutDropdownOpen={breakoutDropdownOpen}
            breakoutDropdownRef={breakoutDropdownRef}
            breakoutLabel={breakoutLabel}
            breakoutTypes={breakoutTypes}
            hasOneOffCalls={hasOneOffCalls}
            onSelectFilter={(filter) => {
              updateSearchParams((next) => {
                if (filter === 'all') next.delete('filter');
                else next.set('filter', filter);
                next.delete('breakoutType');
              });
            }}
            onBackToAllFilters={() => {
              updateSearchParams((next) => {
                next.delete('filter');
                next.delete('breakoutType');
              });
            }}
            onToggleBreakoutDropdown={() => setBreakoutDropdownOpen((open) => !open)}
            onSelectBreakoutType={(breakoutType) => {
              updateSearchParams((next) => {
                if (breakoutType) next.set('breakoutType', breakoutType);
                else next.delete('breakoutType');
              });
              setBreakoutDropdownOpen(false);
            }}
          />
        </div>

        <CallsIndexTimeline sections={dateSections} />
      </div>

      <GlobalCallSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
};

export default CallsIndexPage;
