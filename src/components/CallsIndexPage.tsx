import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from './browserLocation';
import { protocolCalls, callTypeNames, isOneOffCall, type CallType } from '../data/calls';
import { timelineEvents } from '../data/events';
import { upcomingCalls } from '../domain/calls/upcomingCalls';
import GlobalCallSearch from './GlobalCallSearch';
import { SearchTriggerButton } from './search/SearchUi';
import { isSearchHotkey } from './search/searchShortcuts';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // On a scoped path (/calls/acde) the type is path-owned; otherwise it's the
  // query filter. Aggregate filters (acd, breakouts) only ever live in the query.
  const selectedFilter = scope ?? (searchParams.get('filter') || 'all');
  const selectedBreakoutType = scope ? '' : (searchParams.get('breakoutType') || '');
  const [searchOpen, setSearchOpen] = useState(false);
  const [breakoutDropdownOpen, setBreakoutDropdownOpen] = useState(false);
  const breakoutDropdownRef = useRef<HTMLDivElement>(null);

  // Navigate concrete types to their path scope; keep aggregate filters in the query.
  const selectFilter = (filter: string) => {
    if (filter === 'all') navigate('/calls');
    else if (CONCRETE_TYPE_FILTERS.includes(filter)) navigate(`/calls/${filter}`);
    else navigate(`/calls?filter=${filter}`);
  };

  const setBreakoutType = (breakoutType: string | null) => {
    const params = new URLSearchParams();
    params.set('filter', 'breakouts');
    if (breakoutType) params.set('breakoutType', breakoutType);
    navigate(`/calls?${params.toString()}`);
  };

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
  ])).sort((a, b) => (callTypeNames[a as CallType] || a).localeCompare(callTypeNames[b as CallType] || b)), []);

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
            onSelectFilter={selectFilter}
            onBackToAllFilters={() => navigate('/calls')}
            onToggleBreakoutDropdown={() => setBreakoutDropdownOpen((open) => !open)}
            onSelectBreakoutType={(breakoutType) => {
              setBreakoutType(breakoutType);
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
