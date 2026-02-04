import { Link } from 'react-router-dom';
import { networkUpgrades } from '../data/upgrades';
import { getRecentCalls, callTypeNames, type CallType } from '../data/calls';
import { eipsData } from '../data/eips';
import { useAnalytics } from '../hooks/useAnalytics';
import { getProposalPrefix, getLaymanTitle, getInclusionStage } from '../utils/eip';
import ThemeToggle from './ui/ThemeToggle';
import UpgradeCarousel from './ui/UpgradeCarousel';
import { Logo } from './ui/Logo';
import { Tooltip } from './ui/Tooltip';

const HomePage = () => {
  const upgrades = networkUpgrades;
  const recentCalls = getRecentCalls(5);
  const { trackLinkClick } = useAnalytics();

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  // Get featured EIPs - those with most recent inclusion status updates
  const getFeaturedEips = () => {
    // Map each EIP to its most recent status update date
    const eipsWithDates: Array<{ eip: typeof eipsData[0], lastUpdate: Date }> = [];

    eipsData.forEach(eip => {
      let mostRecentDate: Date | null = null;

      // Look through all fork relationships for dated status changes
      eip.forkRelationships.forEach(fork => {
        fork.statusHistory.forEach(statusEntry => {
          if (statusEntry.date) {
            const entryDate = new Date(statusEntry.date);
            if (!mostRecentDate || entryDate > mostRecentDate) {
              mostRecentDate = entryDate;
            }
          }
        });
      });

      // Only include EIPs with dated updates
      if (mostRecentDate) {
        eipsWithDates.push({
          eip,
          lastUpdate: mostRecentDate
        });
      }
    });

    // Sort by most recent and take top 4
    return eipsWithDates
      .sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime())
      .slice(0, 4)
      .map(item => item.eip);
  };

  const featuredEips = getFeaturedEips();

  // Helper to get proper fork display name with accents
  const getForkDisplayName = (forkName: string): string => {
    const displayMap: Record<string, string> = {
      'Hegota': 'Hegotá'
    };
    return displayMap[forkName] || forkName;
  };

  // Fork color helper
  const getForkColor = (forkName: string) => {
    // Look up the fork in networkUpgrades to get its status
    const upgrade = networkUpgrades.find(u => u.name.includes(forkName) || u.id === forkName.toLowerCase());

    if (!upgrade) {
      // Default gray for unknown forks - with border
      return 'bg-slate-50/50 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
    }

    // Color based on upgrade status - using borders and lighter backgrounds to differentiate from stages
    switch (upgrade.status) {
      case 'Live':
        // Green for live forks - with border
        return 'bg-emerald-50/50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
      case 'Upcoming':
        // Blue for upcoming forks - with border
        return 'bg-blue-50/50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      case 'Planning':
        // Purple for planning forks - with border
        return 'bg-purple-50/50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800';
      default:
        return 'bg-slate-50/50 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
    }
  };

  // Colors for call type badges
  const callTypeBadgeColors: Record<CallType, string> = {
    acdc: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    acde: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
    acdt: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    epbs: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    bal: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    focil: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    price: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
    tli: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    pqts: 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Live':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700';
      case 'Scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700';
      case 'Upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';
      case 'Planning':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <Logo size="xl" className="mb-2" />
          <h2 className="text-xl font-light text-slate-700 dark:text-slate-300 tracking-tight">
            Ethereum Upgrade Tracker
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            See what's on the horizon and how it impacts you.
          </p>
        </div>

        {/* Upgrades Carousel */}
        <UpgradeCarousel upgrades={upgrades} getStatusColor={getStatusColor} />

        {/* Featured EIPs Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">
              Recently Updated EIPs
            </h2>
            <Link
              to="/eips"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Browse all EIPs →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredEips.map((eip) => {
              // Get the most recent fork (last in array)
              const mostRecentFork = eip.forkRelationships.length > 0
                ? eip.forkRelationships[eip.forkRelationships.length - 1]
                : null;
              const inclusionStage = mostRecentFork ? getInclusionStage(eip, mostRecentFork.forkName) : null;

              // Get stage label
              const getStageLabel = (stage: string) => {
                switch (stage) {
                  case 'Considered for Inclusion': return 'Considered';
                  case 'Proposed for Inclusion': return 'Proposed';
                  case 'Scheduled for Inclusion': return 'Scheduled';
                  case 'Declined for Inclusion': return 'Declined';
                  case 'Included': return 'Included';
                  case 'Withdrawn': return 'Withdrawn';
                  default: return stage;
                }
              };

              return (
                <Link
                  key={eip.id}
                  to={`/eips/${eip.id}`}
                  className="group flex items-start justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-slate-700/20 hover:border-purple-300 dark:hover:border-purple-600"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-mono font-medium text-purple-600 dark:text-purple-400">
                        {getProposalPrefix(eip)}-{eip.id}
                      </span>
                      {inclusionStage && inclusionStage !== 'Unknown' && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {getStageLabel(inclusionStage)}
                        </span>
                      )}
                      {mostRecentFork && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getForkColor(mostRecentFork.forkName)}`}>
                          {getForkDisplayName(mostRecentFork.forkName)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1 leading-snug">
                      {getLaymanTitle(eip)}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {eip.laymanDescription || eip.description}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Protocol Calls Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">
              Recent Protocol Calls
            </h2>
            <Link
              to="/calls"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              View all calls →
            </Link>
          </div>

          <div className="space-y-2">
            {recentCalls.map((call) => (
              <Link
                key={call.path}
                to={`/calls/${call.path}`}
                className="group flex items-center justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-slate-700/20 hover:border-purple-300 dark:hover:border-purple-600"
              >
                <div className="flex items-center gap-3">
                  <Tooltip text={callTypeNames[call.type]}>
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded min-w-[3.5rem] text-center ${callTypeBadgeColors[call.type]}`}>
                      {call.type.toUpperCase()}
                    </span>
                  </Tooltip>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Call #{call.number}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {call.date}
                  </span>
                </div>
                <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Planning Tools Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">
              Planning Tools
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/schedule"
              className="group flex items-start gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-slate-700/20 hover:border-purple-300 dark:hover:border-purple-600"
            >
              <div className="flex-shrink-0 w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Schedule
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Plan fork timelines with adjustable milestones
                </p>
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/priority"
              className="group flex items-start gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-slate-700/20 hover:border-purple-300 dark:hover:border-purple-600"
            >
              <div className="flex-shrink-0 w-9 h-9 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Client Priority
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Aggregated client team stances on EIPs
                </p>
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/complexity"
              className="group flex items-start gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-slate-700/20 hover:border-purple-300 dark:hover:border-purple-600"
            >
              <div className="flex-shrink-0 w-9 h-9 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Test Complexity
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  STEEL team complexity assessments per EIP
                </p>
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/devnets"
              className="group flex items-start gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-slate-700/20 hover:border-purple-300 dark:hover:border-purple-600"
            >
              <div className="flex-shrink-0 w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Devnet Tracker
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Combined complexity, support, and inclusion status
                </p>
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-slate-500 dark:text-slate-400">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <img
                src="/blobby-gradient-red.svg"
                alt="Ethereum Foundation Protocol Support team logo"
                className="w-16 h-16 cursor-pointer hover:invert dark:invert dark:hover:invert-0 transition-all duration-500"
              />
            </div>
            <div className="text-center">
              <p className="text-sm italic text-slate-500 dark:text-slate-400">
                An experiment by
              </p>
              <p className="text-lg font-light text-slate-700 dark:text-slate-300">
                EF Protocol Support
              </p>
            </div>
          </div>
          <p className="text-xs mb-2">
            <a
              href="https://github.com/ethereum/forkcast"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('source_code', 'https://github.com/ethereum/forkcast')}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-200 inline-flex items-center"
              aria-label="View source code on GitHub"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;