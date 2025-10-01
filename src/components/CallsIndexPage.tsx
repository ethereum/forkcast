import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ui/ThemeToggle';
import { protocolCalls, type Call } from '../data/calls';
import { fetchUpcomingCalls, type UpcomingCall } from '../utils/github';

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
      title: 'Fusaka Live on Holesky Testnet',
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

  // Filter and sort calls and events
  const filteredCalls = selectedFilter === 'all'
    ? calls
    : calls.filter(call => call.type === selectedFilter);

  // Filter upcoming calls based on selected filter
  const filteredUpcomingCalls = selectedFilter === 'all'
    ? upcomingCalls
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
    { value: 'acdc', label: 'ACDC' },
    { value: 'acde', label: 'ACDE' },
    { value: 'acdt', label: 'ACDT' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <Link to="/" className="text-2xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight inline-block mb-2">
            Forkcast
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Protocol Calls</h1>
            <div className="text-sm text-slate-500 dark:text-slate-400">
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
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {filterOptions.map((option) => {
                // Define colors for each filter type
                const activeColors = {
                  all: 'bg-slate-600 dark:bg-slate-400 text-white dark:text-slate-900',
                  acdc: 'bg-purple-500 dark:bg-purple-400 text-white dark:text-purple-950',
                  acde: 'bg-blue-500 dark:bg-blue-400 text-white dark:text-blue-950',
                  acdt: 'bg-green-500 dark:bg-green-400 text-white dark:text-green-950'
                };

                const inactiveColors = {
                  all: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                  acdc: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30',
                  acde: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30',
                  acdt: 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                };

                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedFilter(option.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
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

        <div className="space-y-4">
          {(() => {
            // Group items by month
            const monthGroups = new Map<string, (Call | TimelineEvent | UpcomingCall)[]>();

            sortedItems.forEach((item) => {
              // Parse date as local time, not UTC
              const [year, month, day] = item.date.split('-').map(Number);
              const itemDate = new Date(year, month - 1, day);
              const monthYear = itemDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

              if (!monthGroups.has(monthYear)) {
                monthGroups.set(monthYear, []);
              }
              monthGroups.get(monthYear)!.push(item);
            });

            const monthEntries = Array.from(monthGroups.entries());

            // Render each month group
            return monthEntries.map(([monthYear, items], monthIndex) => (
              <div key={`month-${monthYear}`} className="relative">
                {/* Subtle connecting line between months */}
                {monthIndex < monthEntries.length - 1 && (
                  <div className="absolute left-1/2 bottom-0 translate-y-full w-px h-4 bg-slate-200 dark:bg-slate-700" />
                )}

                <div className="bg-white dark:bg-slate-800/50 rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                  {/* Month header with gradient accent */}
                  <div className="px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-700/50">
                    <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {monthYear}
                    </h3>
                  </div>
                  <div className="p-3">
                    <div className="space-y-2">
                      {items.map((item) => {
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

                          return (
                            <div
                              key={`event-${event.date}-${event.title}`}
                              className="relative pl-8 py-2.5 opacity-75 hover:opacity-90 transition-opacity"
                            >
                              <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-r ${eventColors[event.category]}`}></div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  {event.title}
                                </span>
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
                            acdc: 'border-l-purple-500 dark:border-l-purple-400',
                            acde: 'border-l-blue-500 dark:border-l-blue-400',
                            acdt: 'border-l-green-500 dark:border-l-green-400'
                          };

                          const upcomingCallTypeBadgeColors = {
                            acdc: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
                            acde: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                            acdt: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
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
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${upcomingCallTypeBadgeColors[upcomingCall.type]}`}>
                                    {upcomingCall.type.toUpperCase()}
                                  </span>
                                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    Meeting #{upcomingCall.number}
                                  </div>
                                  <div className="text-sm text-slate-600 dark:text-slate-400">
                                    {upcomingCall.date}
                                  </div>
                                  <div className="hidden sm:flex items-center gap-1.5 ml-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Upcoming</span>
                                  </div>
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
                          acdc: 'border-l-purple-500 dark:border-l-purple-400',
                          acde: 'border-l-blue-500 dark:border-l-blue-400',
                          acdt: 'border-l-green-500 dark:border-l-green-400'
                        };

                        const callTypeBadgeColors = {
                          acdc: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
                          acde: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                          acdt: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        };

                        return (
                          <Link
                            key={call.path}
                            to={`/calls/${call.path}`}
                            className={`block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-md dark:hover:shadow-slate-700/20 transition-all hover:border-slate-300 dark:hover:border-slate-600 group border-l-4 ${callTypeColors[call.type]}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${callTypeBadgeColors[call.type]}`}>
                                  {call.type.toUpperCase()}
                                </span>
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  Meeting #{call.number}
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
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};

export default CallsIndexPage;