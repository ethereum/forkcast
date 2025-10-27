import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ui/ThemeToggle';
import { protocolCalls, type Call } from '../data/calls';
import { fetchUpcomingCalls, type UpcomingCall } from '../utils/github';
import GlobalCallSearch from './GlobalCallSearch';

interface TimelineEvent {
  type: 'event';
  date: string;
  title: string;
  category: 'mainnet' | 'testnet' | 'milestone' | 'announcement' | 'devnet';
}

const CallsIndexPage: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showEvents, setShowEvents] = useState<boolean>(true);
  const [upcomingCalls, setUpcomingCalls] = useState<UpcomingCall[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const calls = protocolCalls;

  const timelineEvents: TimelineEvent[] = [
    {
      type: 'event',
      date: '2025-05-07',
      title: 'Pectra Live on Mainnet',
      category: 'mainnet'
    },
    {
      type: 'event',
      date: '2025-05-26',
      title: 'Fusaka Devnet-0 Launches',
      category: 'devnet'
    },
    {
      type: 'event',
      date: '2025-06-09',
      title: 'Fusaka Devnet-1 Launches',
      category: 'devnet'
    },
    {
      type: 'event',
      date: '2025-06-26',
      title: 'Fusaka Devnet-2 Launches',
      category: 'devnet'
    },
    {
      type: 'event',
      date: '2025-07-23',
      title: 'Fusaka Devnet-3 Launches',
      category: 'devnet'
    },
    {
      type: 'event',
      date: '2025-07-30',
      title: 'Ethereum Turns 10! 🎉',
      category: 'milestone'
    },
    {
      type: 'event',
      date: '2025-08-08',
      title: 'Fusaka Devnet-4 Launches',
      category: 'devnet'
    },
    {
      type: 'event',
      date: '2025-09-10',
      title: 'Fusaka Devnet-5 Launches',
      category: 'devnet'
    },
    {
      type: 'event',
      date: '2025-10-01',
      title: 'Fusaka Live on Holešky Testnet',
      category: 'testnet'
    },
    {
      type: 'event',
      date: '2025-10-07',
      title: 'Fusaka BPO1 on Holešky (10/15 blobs)',
      category: 'testnet'
    },
    {
      type: 'event',
      date: '2025-10-13',
      title: 'Fusaka BPO2 on Holešky (14/21 blobs)',
      category: 'testnet'
    },
    {
      type: 'event',
      date: '2025-10-14',
      title: 'Fusaka Live on Sepolia Testnet',
      category: 'testnet'
    },
    {
      type: 'event',
      date: '2025-10-21',
      title: 'Fusaka BPO1 on Sepolia (10/15 blobs)',
      category: 'testnet'
    },
    {
      type: 'event',
      date: '2025-10-27',
      title: 'Fusaka BPO2 on Sepolia (14/21 blobs)',
      category: 'testnet'
    },
    {
      type: 'event',
      date: '2025-10-28',
      title: 'Fusaka Live on Hoodi Testnet',
      category: 'testnet'
    },
    {
      type: 'event',
      date: '2025-11-05',
      title: 'Fusaka BPO1 on Hoodi (10/15 blobs)',
      category: 'testnet'
    },
    {
      type: 'event',
      date: '2025-11-12',
      title: 'Fusaka BPO2 on Hoodi (14/21 blobs)',
      category: 'testnet'
    }
  ];

  // Fetch upcoming calls on component mount
  useEffect(() => {
    const loadUpcomingCalls = async () => {
      try {
        const upcoming = await fetchUpcomingCalls();
        setUpcomingCalls(upcoming);
      } catch (error) {
        console.error('Failed to load upcoming calls:', error);
      }
    };

    loadUpcomingCalls();
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter and sort calls and events
  const filteredCalls = selectedFilter === 'all'
    ? calls
    : selectedFilter === 'acd'
    ? calls.filter(call => ['acdc', 'acde', 'acdt'].includes(call.type))
    : selectedFilter === 'breakouts'
    ? calls.filter(call => ['epbs', 'bal', 'focil'].includes(call.type))
    : calls.filter(call => call.type === selectedFilter);

  // Filter upcoming calls based on selected filter
  const filteredUpcomingCalls = selectedFilter === 'all'
    ? upcomingCalls
    : selectedFilter === 'acd'
    ? upcomingCalls.filter(call => ['acdc', 'acde', 'acdt'].includes(call.type))
    : selectedFilter === 'breakouts'
    ? upcomingCalls.filter(call => ['epbs', 'bal', 'focil'].includes(call.type))
    : upcomingCalls.filter(call => call.type === selectedFilter);

  // Combine calls, upcoming calls, and events into timeline items
  type TimelineItem = Call | TimelineEvent | UpcomingCall;
  const timelineItems: TimelineItem[] = [
    ...filteredCalls,
    ...filteredUpcomingCalls, // Add filtered upcoming calls to timeline
    ...(showEvents ? timelineEvents : []) // Show events based on toggle
  ];

  const sortedItems = [...timelineItems].sort((a, b) => b.date.localeCompare(a.date));

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'acd', label: 'ACD' },
    { value: 'acdc', label: 'ACDC' },
    { value: 'acde', label: 'ACDE' },
    { value: 'acdt', label: 'ACDT' },
    { value: 'breakouts', label: 'Breakouts' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6 relative">
          <div className="absolute top-0 right-0 flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              aria-label="Search all calls"
              title="Search (⌘F)"
            >
              <svg
                className="w-5 h-5 text-slate-700 dark:text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            <ThemeToggle />
          </div>
          <Link to="/" className="text-2xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight inline-block mb-2">
            Forkcast
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Protocol Calendar</h1>
            <div className="hidden sm:block text-sm text-slate-500 dark:text-slate-400">
              {filteredCalls.length} calls
              {filteredUpcomingCalls.length > 0 && (
                <span> • {filteredUpcomingCalls.length} upcoming</span>
              )}
              {showEvents && timelineEvents.length > 0 && (
                <span> • {timelineEvents.length} events</span>
              )}
            </div>
          </div>

          {/* Filter buttons and events toggle */}
          <div className="flex items-center justify-between mt-4 gap-2">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-nowrap sm:flex-wrap">
              {filterOptions.map((option) => {
                // Define colors for each filter type
                const activeColors = {
                  all: 'bg-slate-600 dark:bg-slate-400 text-white dark:text-slate-900',
                  acd: 'bg-indigo-600 dark:bg-indigo-500 text-white dark:text-white',
                  acdc: 'bg-blue-600 dark:bg-blue-500 text-white dark:text-white',
                  acde: 'bg-sky-600 dark:bg-sky-500 text-white dark:text-white',
                  acdt: 'bg-teal-600 dark:bg-teal-500 text-white dark:text-white',
                  breakouts: 'bg-yellow-600 dark:bg-yellow-500 text-white dark:text-yellow-950'
                };

                const inactiveColors = {
                  all: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                  acd: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
                  acdc: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30',
                  acde: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/30',
                  acdt: 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/30',
                  breakouts: 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                };

                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedFilter(option.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0 ${
                      selectedFilter === option.value
                        ? activeColors[option.value as keyof typeof activeColors]
                        : inactiveColors[option.value as keyof typeof inactiveColors]
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* Events toggle */}
            <button
              onClick={() => setShowEvents(!showEvents)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                showEvents
                  ? 'bg-slate-600 dark:bg-slate-400 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${showEvents ? 'bg-white dark:bg-slate-900' : 'bg-slate-500 dark:bg-slate-400'}`}></div>
              <span>{showEvents ? 'Hide Events' : 'Show Events'}</span>
            </button>
          </div>
        </div>

        {/* Timeline container with vertical line */}
        <div className="relative pl-12">
          {/* Vertical timeline line */}
          <div className="absolute left-10 top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700"></div>

          <div className="space-y-3">
            {(() => {
              let lastMonthYear = '';
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              let hasCrossedToday = false;

              return sortedItems.map((item, index) => {
                // Parse date as local time, not UTC
                const [year, month, day] = item.date.split('-').map(Number);
                const itemDate = new Date(year, month - 1, day);
                itemDate.setHours(0, 0, 0, 0);
                const monthYear = itemDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const monthName = itemDate.toLocaleDateString('en-US', { month: 'short' });
                const yearString = itemDate.toLocaleDateString('en-US', { year: 'numeric' });
                const showMonthLabel = monthYear !== lastMonthYear;

                if (showMonthLabel) {
                  lastMonthYear = monthYear;
                }

                // Check if we need to show the today divider
                const isUpcoming = itemDate > today;
                const wasPreviousUpcoming = index > 0 ? (() => {
                  const [prevYear, prevMonth, prevDay] = sortedItems[index - 1].date.split('-').map(Number);
                  const prevDate = new Date(prevYear, prevMonth - 1, prevDay);
                  prevDate.setHours(0, 0, 0, 0);
                  return prevDate > today;
                })() : true;
                const showTodayDivider = !hasCrossedToday && wasPreviousUpcoming && !isUpcoming;

                if (showTodayDivider) {
                  hasCrossedToday = true;
                }

                return (
                  <React.Fragment key={`item-${index}`}>
                    {showTodayDivider && (
                      <div className="relative my-6 ml-2 flex items-center gap-3">
                        <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider whitespace-nowrap">
                          Today
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-amber-400 to-transparent dark:from-amber-500 dark:to-transparent"></div>
                      </div>
                    )}
                    <div className="relative">
                    {/* Month label - absolutely positioned */}
                    {showMonthLabel && (
                      <div className="absolute left-[-3rem] top-0 w-8 flex flex-col items-start">
                        <div className="sticky top-8">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider [writing-mode:vertical-lr] rotate-180">
                            {monthName}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 [writing-mode:vertical-lr] rotate-180 mt-1">
                            {yearString}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Timeline connector - horizontal line from timeline to item */}
                    <div className="absolute left-[-0.5rem] top-1/2 -translate-y-1/2 w-2 h-px bg-slate-300 dark:bg-slate-600"></div>

                    {/* Timeline item */}
                    <div className="ml-2">
                    {(() => {
                        // Render timeline event
                        if (item.type === 'event') {
                          const event = item as TimelineEvent;
                          const eventColors = {
                            'mainnet': 'from-emerald-500 to-green-600',
                            'testnet': 'from-teal-500 to-cyan-600',
                            milestone: 'from-blue-500 to-indigo-600',
                            announcement: 'from-purple-500 to-violet-600',
                            devnet: 'from-orange-500 to-amber-600'
                          };

                          const eventBorderColors = {
                            'mainnet': 'border-emerald-500',
                            'testnet': 'border-teal-500',
                            milestone: 'border-blue-500',
                            announcement: 'border-purple-500',
                            devnet: 'border-orange-500'
                          };

                          // Check if event is upcoming
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const [year, month, day] = event.date.split('-').map(Number);
                          const eventDate = new Date(year, month - 1, day);
                          eventDate.setHours(0, 0, 0, 0);
                          const isUpcoming = eventDate > today;

                          return (
                            <div
                              key={`event-${event.date}-${event.title}`}
                              className="relative pl-8 py-2.5 opacity-75 hover:opacity-90 transition-opacity"
                            >
                              {/* Mainnet events get a double-circle effect */}
                              {event.category === 'mainnet' && (
                                <div className={`absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${
                                  isUpcoming ? 'border-emerald-400' : 'border-emerald-500'
                                }`}></div>
                              )}
                              <div className={`absolute left-3 top-1/2 -translate-y-1/2 rounded-full ${
                                isUpcoming
                                  ? `w-2 h-2 border-2 ${eventBorderColors[event.category]}`
                                  : `w-2 h-2 bg-gradient-to-r ${eventColors[event.category]}`
                              }`}></div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${
                                    event.category === 'mainnet'
                                      ? 'text-slate-800 dark:text-slate-200'
                                      : 'text-slate-700 dark:text-slate-300'
                                  }`}>
                                    {event.title}
                                  </span>
                                  {isUpcoming && (
                                    <div className="hidden sm:flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></div>
                                      <span className="text-xs text-slate-500 dark:text-slate-400">Upcoming</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  {event.date}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Check if it's an upcoming call
                        if ('githubUrl' in item) {
                          const upcomingCall = item as UpcomingCall;

                          // Define colors for upcoming calls - same colors as completed but with dashed border
                          const upcomingCallTypeColors = {
                            acdc: 'border-l-blue-500 dark:border-l-blue-400',
                            acde: 'border-l-sky-500 dark:border-l-sky-400',
                            acdt: 'border-l-teal-500 dark:border-l-teal-400',
                            epbs: 'border-l-amber-500 dark:border-l-amber-400',
                            bal: 'border-l-red-500 dark:border-l-red-400',
                            focil: 'border-l-orange-500 dark:border-l-orange-400'
                          };

                          const upcomingCallTypeBadgeColors = {
                            acdc: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                            acde: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
                            acdt: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
                            epbs: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                            bal: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                            focil: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          };

                          return (
                            <a
                              key={`upcoming-${upcomingCall.type}-${upcomingCall.number}`}
                              href={upcomingCall.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-md dark:hover:shadow-slate-700/20 transition-all hover:border-slate-300 dark:hover:border-slate-600 group border-l-3 ${upcomingCallTypeColors[upcomingCall.type]}`}
                              style={{ borderLeftStyle: 'dashed' }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full min-w-[3.5rem] text-center ${upcomingCallTypeBadgeColors[upcomingCall.type]}`}>
                                    {upcomingCall.type.toUpperCase()}
                                  </span>
                                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    Call #{upcomingCall.number}
                                  </div>
                                  <div className="text-sm text-slate-600 dark:text-slate-400">
                                    {upcomingCall.date}
                                  </div>
                                  {isUpcoming && (
                                    <div className="hidden sm:flex items-center gap-1.5 ml-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Upcoming</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                  ↗
                                </div>
                              </div>
                            </a>
                          );
                        }

                        // Render completed call
                        const call = item as Call;

                        // Define colors for each call type
                        const callTypeColors = {
                          acdc: 'border-l-blue-500 dark:border-l-blue-400',
                          acde: 'border-l-sky-500 dark:border-l-sky-400',
                          acdt: 'border-l-teal-500 dark:border-l-teal-400',
                          epbs: 'border-l-amber-500 dark:border-l-amber-400',
                          bal: 'border-l-red-500 dark:border-l-red-400',
                          focil: 'border-l-orange-500 dark:border-l-orange-400'
                        };

                        const callTypeBadgeColors = {
                          acdc: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                          acde: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
                          acdt: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
                          epbs: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                          bal: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                          focil: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        };

                        return (
                          <Link
                            key={call.path}
                            to={`/calls/${call.path}`}
                            className={`block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-md dark:hover:shadow-slate-700/20 transition-all hover:border-slate-300 dark:hover:border-slate-600 group border-l-4 ${callTypeColors[call.type]}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full min-w-[3.5rem] text-center ${callTypeBadgeColors[call.type]}`}>
                                  {call.type.toUpperCase()}
                                </span>
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  Call #{call.number}
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                  {call.date}
                                </div>
                              </div>
                              <div className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                →
                              </div>
                            </div>
                          </Link>
                        );
                    })()}
                    </div>
                    </div>
                  </React.Fragment>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalCallSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
};

export default CallsIndexPage;