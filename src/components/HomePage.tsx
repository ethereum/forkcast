import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { networkUpgrades, NetworkUpgrade } from '../data/upgrades';
import { getRecentCalls, isOneOffCall, callTypeNames, protocolCalls, type Call, type CallType } from '../data/calls';
import { eipsData, eipById } from '../data/eips';
import { useAnalytics } from '../hooks/useAnalytics';
import { getProposalPrefix, getLaymanTitle, getInclusionStage } from '../utils/eip';
import UpgradeCard from './ui/UpgradeCard';
import { StructuredDecisionContent } from './call/KeyDecisionsSection';
import { EIP, KeyDecision } from '../types/eip';

const ACD_TYPES: CallType[] = ['acdc', 'acde', 'acdt'];

interface RecentMeetingDecisions {
  call: Call;
  decisions: KeyDecision[];
}

const latestDatedStatusTimestamp = (eip: EIP): number | null => {
  let latest: number | null = null;

  for (const fork of eip.forkRelationships) {
    for (const entry of fork.statusHistory) {
      if (!entry.date) continue;

      const timestamp = Date.parse(entry.date);
      if (!Number.isFinite(timestamp)) continue;

      latest = latest === null ? timestamp : Math.max(latest, timestamp);
    }
  }

  return latest;
};

const fetchLatestMeetingDecisions = async (): Promise<RecentMeetingDecisions | null> => {
  const acdCalls = protocolCalls
    .filter((call) => ACD_TYPES.includes(call.type as CallType))
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const call of acdCalls) {
    try {
      const artifactPath = `${call.type}/${call.date}_${call.number}`;
      const response = await fetch(`/artifacts/${artifactPath}/key_decisions.json`);
      if (!response.ok) continue;

      const data = await response.json();
      const decisions: KeyDecision[] = data?.key_decisions;
      if (Array.isArray(decisions) && decisions.length > 0) {
        return { call, decisions };
      }
    } catch {
      // Network or parse failure — try the next call rather than tearing down the section.
    }
  }

  return null;
};

const quickLinks: NetworkUpgrade[] = (() => {
  const active = networkUpgrades.filter((u) => !u.disabled);
  const previous = [...active].reverse().find((u) => u.status === 'Live');
  const current = active.find((u) => u.status === 'Upcoming');
  const future = active.find((u) => u.status === 'Planning' || u.status === 'Research');
  return [previous, current, future].filter((u): u is NetworkUpgrade => u !== undefined);
})();

const featuredEips: EIP[] = (() => {
  return eipsData
    .map((eip) => ({ eip, lastUpdate: latestDatedStatusTimestamp(eip) }))
    .filter((item): item is { eip: EIP; lastUpdate: number } => item.lastUpdate !== null)
    .sort((a, b) => b.lastUpdate - a.lastUpdate)
    .slice(0, 4)
    .map((item) => item.eip);
})();

const HomePage = () => {
  const recentCalls = getRecentCalls(5);
  const [recentMeetingDecisions, setRecentMeetingDecisions] = useState<RecentMeetingDecisions | null>(null);
  const { trackLinkClick } = useAnalytics();

  useEffect(() => {
    let cancelled = false;

    fetchLatestMeetingDecisions().then((result) => {
      if (!cancelled) {
        setRecentMeetingDecisions(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

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
    acdt: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
    epbs: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    bal: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    focil: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    price: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    tli: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
    pqts: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    rpc: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    zkevm: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300',
    etm: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    awd: 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300',
    pqi: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    fcr: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    aa: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight mb-2">
            Ethereum Upgrade Tracker
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            See what's on the horizon and how it impacts you.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">
              Network Upgrades
            </h2>
            <Link
              to="/upgrades"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              View all upgrades →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickLinks.map((upgrade) => (
              <UpgradeCard key={upgrade.id} upgrade={upgrade} />
            ))}
          </div>
        </div>

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
            {recentCalls.map((call) => {
              const oneOff = isOneOffCall(call.type);
              const fallbackBadgeColor = 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300';
              return (
                <Link
                  key={call.path}
                  to={`/calls/${call.path}`}
                  className="group flex items-center justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-slate-700/20 hover:border-purple-300 dark:hover:border-purple-600"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded min-w-[3.5rem] text-center flex-shrink-0 ${callTypeBadgeColors[call.type as CallType] || fallbackBadgeColor}`}>
                      {oneOff ? '1-OFF' : call.type.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {oneOff
                        ? call.name || call.type
                        : <><span className="sm:hidden">Call #{call.number}</span><span className="hidden sm:inline">{callTypeNames[call.type as CallType] || call.type} #{call.number}</span></>
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {call.date}
                    </span>
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {recentMeetingDecisions && (() => {
          const { call, decisions } = recentMeetingDecisions;
          const callType = call.type as CallType;
          const callBadgeColor = callTypeBadgeColors[callType];
          const callName = callTypeNames[callType];
          return (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">
                  Recent Decisions
                </h2>
                <Link
                  to="/decisions"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  View all decisions →
                </Link>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <Link
                  to={`/calls/${call.path}`}
                  className="group flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded min-w-[3.5rem] text-center flex-shrink-0 ${callBadgeColor}`}>
                      {call.type.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {callName} #{call.number}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-400">
                      {call.date}
                    </span>
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>

                <ul className="px-4 py-3 space-y-1.5 list-none">
                  {decisions.map((decision, i) => {
                    const isStructured = decision.type !== 'other';
                    return (
                      <li
                        key={i}
                        className="text-sm before:content-['→'] before:mr-2 before:text-slate-400 dark:before:text-slate-500 text-slate-600 dark:text-slate-400"
                      >
                        {isStructured
                          ? <StructuredDecisionContent decision={decision} eipMap={eipById} />
                          : decision.original_text}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })()}

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
                  Devnets
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Active devnet series and combined inclusion status
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
            <a
              href="https://ps.ethereum.foundation"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('team_website', 'https://ps.ethereum.foundation')}
              className="w-16 h-16 mx-auto mb-3 flex items-center justify-center"
            >
              <img
                src="/blobby-gradient-red.svg"
                alt="Ethereum Foundation Protocol Support team logo"
                className="w-16 h-16 hover:invert dark:invert dark:hover:invert-0 transition-all duration-500"
              />
            </a>
            <div className="text-center">
              <p className="text-sm italic text-slate-500 dark:text-slate-400">
                Brought to you by
              </p>
              <a
                href="https://ps.ethereum.foundation"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleExternalLinkClick('team_website', 'https://ps.ethereum.foundation')}
                className="text-lg font-light text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200"
              >
                EF Protocol Support
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://ps.ethereum.foundation"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('team_website', 'https://ps.ethereum.foundation')}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-200"
              aria-label="EF Protocol Support website"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" />
              </svg>
            </a>
            <a
              href="https://github.com/ethereum/forkcast"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('source_code', 'https://github.com/ethereum/forkcast')}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-200"
              aria-label="View source code on GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            <a
              href="https://x.com/EFProtocol"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('twitter', 'https://x.com/EFProtocol')}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-200"
              aria-label="EF Protocol Support on X"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
