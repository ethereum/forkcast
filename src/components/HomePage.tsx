import { Link } from 'react-router-dom';
import { networkUpgrades } from '../data/upgrades';
import { useAnalytics } from '../hooks/useAnalytics';

const HomePage = () => {
  const upgrades = networkUpgrades;
  const { trackLinkClick } = useAnalytics();

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Planning':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <Link to="/" className="text-4xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 mb-3 tracking-tight inline-block">
            Forkcast
          </Link>
          <h2 className="text-xl font-light text-slate-700 tracking-tight mb-2">
            Ethereum Upgrade Tracker
          </h2>
          <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            See what's on the horizon and how it impacts you.
          </p>
        </div>

        {/* Upgrades Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {upgrades.map((upgrade) => {
            const cardContent = (
              <>
                <div className="flex items-start justify-between mb-4">
                  <h2 className={`text-xl font-medium leading-tight ${upgrade.disabled ? 'text-slate-500' : 'text-slate-900'}`}>
                    {upgrade.name}
                  </h2>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(upgrade.status)}`}>
                      {upgrade.status}
                    </span>
                    {upgrade.disabled && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
                        Page Coming Soon
                      </span>
                    )}
                  </div>
                </div>
                
                <p className={`text-sm leading-relaxed mb-4 ${upgrade.disabled ? 'text-slate-400' : 'text-slate-600'}`}>
                  {upgrade.tagline}
                </p>
                
                <div className={`text-xs ${upgrade.disabled ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className="font-medium">
                    {upgrade.status === 'Active' ? 'Activated:' : 
                     upgrade.status === 'Upcoming' ? 'Target:' : 
                     upgrade.status === 'Planning' ? 'Target:' : 'Date:'}
                  </span> {upgrade.activationDate}
                </div>
              </>
            );

            if (upgrade.disabled) {
              return (
                <div
                  key={upgrade.path}
                  className="bg-white border border-slate-200 rounded-lg p-6 opacity-60 cursor-not-allowed"
                >
                  {cardContent}
                </div>
              );
            } else {
              return (
                <Link
                  key={upgrade.path}
                  to={upgrade.path}
                  className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-200 hover:border-slate-300"
                >
                  {cardContent}
                </Link>
              );
            }
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-slate-500">
          <p className="italic mb-2">
            An experiment by the Protocol & Application Support team.
          </p>
          <p className="text-xs mb-4">
            Have feedback? Contact{' '}
            <a
              href="mailto:nixo@ethereum.org"
              onClick={() => handleExternalLinkClick('email_contact', 'mailto:nixo@ethereum.org')}
              className="text-slate-500 hover:text-slate-700 underline decoration-1 underline-offset-2"
            >
              nixo
            </a>
            {' '}or{' '}
            <a
              href="https://x.com/wolovim"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('twitter_contact', 'https://x.com/wolovim')}
              className="text-slate-500 hover:text-slate-700 underline decoration-1 underline-offset-2"
            >
              @wolovim
            </a>
          </p>
          <p className="text-xs mb-2">
            <a
              href="https://github.com/wolovim/forkcast"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('source_code', 'https://github.com/wolovim/forkcast')}
              className="text-slate-500 hover:text-slate-700 transition-colors duration-200 inline-flex items-center"
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