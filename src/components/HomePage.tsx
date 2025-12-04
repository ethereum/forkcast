import { Link } from 'react-router-dom';
import { networkUpgrades } from '../data/upgrades';
import { getRecentCalls } from '../data/calls';
import { useAnalytics } from '../hooks/useAnalytics';
import ThemeToggle from './ui/ThemeToggle';
import UpgradeCarousel from './ui/UpgradeCarousel';

const HomePage = () => {
  const upgrades = networkUpgrades;
  const recentCalls = getRecentCalls(5);
  const { trackLinkClick } = useAnalytics();

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  // Colors for call types
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
          <Link to="/" className="text-4xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 mb-2 tracking-tight inline-block">
            Forkcast
          </Link>
          <h2 className="text-xl font-light text-slate-700 dark:text-slate-300 tracking-tight">
            Ethereum Upgrade Tracker
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            See what's on the horizon and how it impacts you.
          </p>
        </div>

        {/* Upgrades Carousel */}
        <UpgradeCarousel upgrades={upgrades} getStatusColor={getStatusColor} />

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

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {recentCalls.map((call) => (
                <Link
                  key={call.path}
                  to={`/calls/${call.path}`}
                  className={`block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-l-4 ${callTypeColors[call.type]}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full min-w-[3.5rem] text-center ${callTypeBadgeColors[call.type]}`}>
                        {call.type.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Call #{call.number}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {call.date}
                      </span>
                    </div>
                    <div className="text-slate-400 dark:text-slate-500">
                      →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-slate-500 dark:text-slate-400">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <img
                src="/blobby-gradient-red.svg"
                alt="Ethereum Foundation Protocol Support team logo"
                className="w-16 h-16 cursor-pointer dark:invert hover:invert-0 transition-all duration-500"
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