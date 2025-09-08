import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ui/ThemeToggle';

interface Call {
  type: 'acdc' | 'acde' | 'acdt';
  date: string;
  number: string;
  path: string;
}

interface TimelineEvent {
  type: 'event';
  date: string;
  title: string;
  description: string;
  category: 'upgrade' | 'milestone' | 'announcement' | 'devnet';
}

const CallsIndexPage: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showEvents, setShowEvents] = useState<boolean>(true);

  // Hardcoded calls data
  const calls: Call[] = [
    // ACDC calls
    { type: 'acdc', date: '2025-04-03', number: '154', path: 'acdc/2025-04-03_154' },
    { type: 'acdc', date: '2025-04-17', number: '155', path: 'acdc/2025-04-17_155' },
    { type: 'acdc', date: '2025-05-01', number: '156', path: 'acdc/2025-05-01_156' },
    { type: 'acdc', date: '2025-05-15', number: '157', path: 'acdc/2025-05-15_157' },
    { type: 'acdc', date: '2025-05-29', number: '158', path: 'acdc/2025-05-29_158' },
    { type: 'acdc', date: '2025-06-26', number: '159', path: 'acdc/2025-06-26_159' },
    { type: 'acdc', date: '2025-07-10', number: '160', path: 'acdc/2025-07-10_160' },
    { type: 'acdc', date: '2025-07-24', number: '161', path: 'acdc/2025-07-24_161' },
    { type: 'acdc', date: '2025-08-07', number: '162', path: 'acdc/2025-08-07_162' },
    { type: 'acdc', date: '2025-08-21', number: '163', path: 'acdc/2025-08-21_163' },
    { type: 'acdc', date: '2025-09-04', number: '164', path: 'acdc/2025-09-04_164' },

    // ACDE calls
    { type: 'acde', date: '2025-03-27', number: '208', path: 'acde/2025-03-27_208' },
    { type: 'acde', date: '2025-04-10', number: '209', path: 'acde/2025-04-10_209' },
    { type: 'acde', date: '2025-04-24', number: '210', path: 'acde/2025-04-24_210' },
    { type: 'acde', date: '2025-05-08', number: '211', path: 'acde/2025-05-08_211' },
    { type: 'acde', date: '2025-05-22', number: '212', path: 'acde/2025-05-22_212' },
    { type: 'acde', date: '2025-06-05', number: '213', path: 'acde/2025-06-05_213' },
    { type: 'acde', date: '2025-06-19', number: '214', path: 'acde/2025-06-19_214' },
    { type: 'acde', date: '2025-07-03', number: '215', path: 'acde/2025-07-03_215' },
    { type: 'acde', date: '2025-07-17', number: '216', path: 'acde/2025-07-17_216' },
    { type: 'acde', date: '2025-07-31', number: '217', path: 'acde/2025-07-31_217' },
    { type: 'acde', date: '2025-08-14', number: '218', path: 'acde/2025-08-14_218' },
    { type: 'acde', date: '2025-08-28', number: '219', path: 'acde/2025-08-28_219' },

    // ACDT calls
    { type: 'acdt', date: '2025-06-16', number: '040', path: 'acdt/2025-06-16_040' },
    { type: 'acdt', date: '2025-06-23', number: '041', path: 'acdt/2025-06-23_041' },
    { type: 'acdt', date: '2025-06-30', number: '042', path: 'acdt/2025-06-30_042' },
    { type: 'acdt', date: '2025-07-07', number: '043', path: 'acdt/2025-07-07_043' },
    { type: 'acdt', date: '2025-07-14', number: '044', path: 'acdt/2025-07-14_044' },
    { type: 'acdt', date: '2025-07-21', number: '045', path: 'acdt/2025-07-21_045' },
    { type: 'acdt', date: '2025-07-28', number: '046', path: 'acdt/2025-07-28_046' },
    { type: 'acdt', date: '2025-08-04', number: '047', path: 'acdt/2025-08-04_047' },
    { type: 'acdt', date: '2025-08-11', number: '048', path: 'acdt/2025-08-11_048' },
    { type: 'acdt', date: '2025-08-18', number: '049', path: 'acdt/2025-08-18_049' },
    { type: 'acdt', date: '2025-08-25', number: '050', path: 'acdt/2025-08-25_050' },
    { type: 'acdt', date: '2025-09-01', number: '051', path: 'acdt/2025-09-01_051' },
    { type: 'acdt', date: '2025-09-08', number: '052', path: 'acdt/2025-09-08_052' },
  ];

  // Timeline events for context
  const timelineEvents: TimelineEvent[] = [
    {
      type: 'event',
      date: '2025-05-07',
      title: 'Pectra Upgrade Goes Live',
      description: 'The Pectra upgrade successfully activates on Ethereum mainnet',
      category: 'upgrade'
    },
    {
      type: 'event',
      date: '2025-05-26',
      title: 'Fusaka Devnet-0 Launches',
      description: 'First Fusaka testnet launched for testing upcoming features',
      category: 'devnet'
    },
    {
      type: 'event',
      date: '2025-06-09',
      title: 'Fusaka Devnet-1 Launches',
      description: 'Second iteration of Fusaka testnet with improvements',
      category: 'devnet'
    },
    {
      type: 'event',
      date: '2025-06-26',
      title: 'Fusaka Devnet-2 Launches',
      description: 'Third Fusaka testnet deployment with additional fixes',
      category: 'devnet'
    },
    {
      type: 'event',
      date: '2025-07-23',
      title: 'Fusaka Devnet-3 Launches',
      description: 'Fourth Fusaka testnet iteration for stability testing',
      category: 'devnet'
    },
    {
      type: 'event',
      date: '2025-07-30',
      title: 'Ethereum Turns 10! 🎉',
      description: 'The community celebrates the 10th anniversary of Ethereum Mainnet.',
      category: 'milestone'
    },
    {
      type: 'event',
      date: '2025-08-08',
      title: 'Fusaka Devnet-4 Launches',
      description: 'Fifth and latest Fusaka testnet deployment',
      category: 'devnet'
    }
  ];


  // Filter and sort calls and events
  const filteredCalls = selectedFilter === 'all'
    ? calls
    : calls.filter(call => call.type === selectedFilter);

  // Combine calls and events into timeline items
  type TimelineItem = Call | TimelineEvent;
  const timelineItems: TimelineItem[] = [
    ...filteredCalls,
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
            const monthGroups = new Map<string, (Call | TimelineEvent)[]>();

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
                            upgrade: 'from-green-500 to-emerald-600',
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

                        // Render call
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