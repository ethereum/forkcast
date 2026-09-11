import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from './navigation';
import { protocolCalls, callTypeNames, isOneOffCall, type CallType } from '../data/calls';
import { timelineEvents } from '../data/events';
import {
  fetchUpcomingCallsIfAvailable,
  upcomingCalls as upcomingCallsSnapshot,
  type UpcomingCall
} from '../domain/calls/upcomingCalls';
import { SearchTriggerButton } from './search/SearchUi';
import { openGlobalSearch } from '../domain/search/globalSearchBridge';
import { buildTimelineDateSections } from '../domain/calls/timeline';
import { getTodayDateString } from '../utils/localDate';
import { CallsIndexFilters } from './calls-index/CallsIndexFilters';
import { CallsIndexTimeline } from './calls-index/CallsIndexTimeline';

const ACD_TYPES = ['acdc', 'acde', 'acdt'];

// Concrete call-type filters own a path scope (/calls/acde); aggregate filters
// (acd, breakouts) stay query-string state on /calls.
const CONCRETE_TYPE_FILTERS = ['acdc', 'acde', 'acdt'];

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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // On a scoped path (/calls/acde) the type is path-owned; otherwise it's the
  // query filter. Aggregate filters (acd, breakouts) only ever live in the query.
  const selectedFilter = scope ?? (searchParams.get('filter') || 'all');
  const selectedBreakoutType = scope ? '' : (searchParams.get('breakoutType') || '');
  const showEvents = searchParams.get('events') !== 'hide';
  const [upcomingCalls, setUpcomingCalls] = useState<UpcomingCall[]>(upcomingCallsSnapshot);
  const [upcomingCallsLoading, setUpcomingCallsLoading] = useState(true);
  const [breakoutDropdownOpen, setBreakoutDropdownOpen] = useState(false);
  const breakoutDropdownRef = useRef<HTMLDivElement>(null);

  // Picking a filter rebuilds the query from scratch, so anything orthogonal to
  // the filter has to be carried across here or it resets on every click.
  const buildQuery = (filterParams: Record<string, string | undefined>): string => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filterParams)) {
      if (value) params.set(key, value);
    }
    if (!showEvents) params.set('events', 'hide');
    const query = params.toString();
    return query ? `?${query}` : '';
  };

  // Navigate concrete types to their path scope; keep aggregate filters in the query.
  const selectFilter = (filter: string) => {
    if (filter === 'all') navigate(`/calls${buildQuery({})}`);
    else if (CONCRETE_TYPE_FILTERS.includes(filter)) navigate(`/calls/${filter}${buildQuery({})}`);
    else navigate(`/calls${buildQuery({ filter })}`);
  };

  const setBreakoutType = (breakoutType: string | null) => {
    navigate(`/calls${buildQuery({ filter: 'breakouts', breakoutType: breakoutType ?? undefined })}`);
  };

  const toggleEvents = (next: boolean) => {
    setSearchParams((params) => {
      if (next) params.delete('events');
      else params.set('events', 'hide');
      return params;
    }, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    const loadUpcomingCalls = async () => {
      const upcoming = await fetchUpcomingCallsIfAvailable();
      if (!cancelled && upcoming) setUpcomingCalls(upcoming);
      if (!cancelled) setUpcomingCallsLoading(false);
    };

    loadUpcomingCalls();

    return () => {
      cancelled = true;
    };
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
      ...(showEvents ? timelineEvents : [])
    ];
  }, [filteredCalls, filteredUpcomingCalls, showEvents]);

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
              onOpen={() => openGlobalSearch({ scope: 'calls' })}
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
            showEvents={showEvents}
            onToggleEvents={toggleEvents}
            onSelectFilter={selectFilter}
            onBackToAllFilters={() => selectFilter('all')}
            onToggleBreakoutDropdown={() => setBreakoutDropdownOpen((open) => !open)}
            onSelectBreakoutType={(breakoutType) => {
              setBreakoutType(breakoutType);
              setBreakoutDropdownOpen(false);
            }}
          />
        </div>

        <CallsIndexTimeline sections={dateSections} />
      </div>
    </div>
  );
};

export default CallsIndexPage;
