import { Link } from 'react-router-dom';
import { networkUpgrades } from '../data/upgrades';

const HomePage = () => {
  const upgrades = networkUpgrades;

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
                        Coming Soon
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
          <p className="text-xs">
            Have feedback? Contact{' '}
            <a
              href="mailto:nixo@ethereum.org"
              className="text-slate-500 hover:text-slate-700 underline decoration-1 underline-offset-2"
            >
              nixo
            </a>
            {' '}or{' '}
            <a
              href="https://x.com/wolovim"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-700 underline decoration-1 underline-offset-2"
            >
              @wolovim
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;