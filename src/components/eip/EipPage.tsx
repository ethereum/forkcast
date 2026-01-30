import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Link, useParams, Navigate, useNavigate } from 'react-router-dom';
import { eipsData } from '../../data/eips';
import { useMetaTags } from '../../hooks/useMetaTags';
import { useAnalytics } from '../../hooks/useAnalytics';
import {
  getLaymanTitle,
  getProposalPrefix,
  getSpecificationUrl,
  parseMarkdownLinks,
  parseAuthors,
  getPrimaryEipLayer,
} from '../../utils';
import { Tooltip } from '../ui';
import ThemeToggle from '../ui/ThemeToggle';
import { Logo } from '../ui/Logo';
import { EipTimeline } from './EipTimeline';
import { EipSearch } from './EipSearch';
import EipSearchModal from './EipSearchModal';
import {
  getBreakoutCallForEip,
  getBreakoutCallNavigation,
  getBreakoutCallPath,
} from '../../data/calls';
import { fetchUpcomingCalls, type UpcomingCall } from '../../utils/github';

export const EipPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { trackLinkClick } = useAnalytics();
  const navigate = useNavigate();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [upcomingCall, setUpcomingCall] = useState<UpcomingCall | null>(null);

  const eipId = parseInt(id || '', 10);
  const eip = eipsData.find((e) => e.id === eipId);
  const layer = eip ? getPrimaryEipLayer(eip) : null;
  const breakoutCallInfo = getBreakoutCallForEip(eipId);
  const breakoutNav = breakoutCallInfo ? getBreakoutCallNavigation(breakoutCallInfo.type) : null;

  // Get sorted EIPs for navigation
  const sortedEips = useMemo(() => [...eipsData].sort((a, b) => a.id - b.id), []);
  const currentIndex = sortedEips.findIndex((e) => e.id === eipId);
  const prevEip = currentIndex > 0 ? sortedEips[currentIndex - 1] : null;
  const nextEip = currentIndex < sortedEips.length - 1 ? sortedEips[currentIndex + 1] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Fetch upcoming breakout call if this EIP has one
  useEffect(() => {
    if (breakoutCallInfo) {
      fetchUpcomingCalls().then((calls) => {
        const upcoming = calls.find((c) => c.type === breakoutCallInfo.type);
        setUpcomingCall(upcoming || null);
      });
    } else {
      setUpcomingCall(null);
    }
  }, [breakoutCallInfo]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle Cmd/Ctrl+F for search
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      setSearchModalOpen(true);
      return;
    }

    // Don't navigate if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (e.key === 'ArrowLeft' && prevEip) {
      navigate(`/eips/${prevEip.id}`);
    } else if (e.key === 'ArrowRight' && nextEip) {
      navigate(`/eips/${nextEip.id}`);
    }
  }, [navigate, prevEip, nextEip]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useMetaTags({
    title: eip ? `${getProposalPrefix(eip)}-${eip.id}: ${getLaymanTitle(eip)} - Forkcast` : 'EIP Not Found - Forkcast',
    description: eip?.description || 'Ethereum Improvement Proposal details',
    url: `https://forkcast.org/eips/${id}`,
  });

  if (!eip) {
    return <Navigate to="/" replace />;
  }

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Site Header */}
        <div className="mb-6 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <Link
              to="/eips"
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>All EIPs</span>
            </Link>
            <EipSearch onOpen={() => setSearchModalOpen(true)} />
            <ThemeToggle />
          </div>
        </div>

        {/* Main Card */}
        <article className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          {/* Metadata Header */}
          <header className="p-6 bg-gradient-to-br from-purple-50 via-slate-50 to-blue-50 dark:from-purple-900/20 dark:via-slate-800 dark:to-blue-900/20 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-slate-400 dark:text-slate-500 text-sm font-mono">
                    {getProposalPrefix(eip)}-{eip.id}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-transparent">
                    {eip.status}
                  </span>
                  {layer && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      layer === 'EL'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600'
                        : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 border border-teal-200 dark:border-teal-600'
                    }`} title={layer === 'EL' ? 'Primarily impacts Execution Layer' : 'Primarily impacts Consensus Layer'}>
                      {layer}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-100 leading-tight">
                  {getLaymanTitle(eip)}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Authors:{' '}
                  {parseAuthors(eip.author).map((author, index, arr) => (
                    <span key={index}>
                      {author.handle ? (
                        <Tooltip text={`${author.handle} (click to copy)`} className="inline">
                          <span
                            className="cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                            onClick={() => navigator.clipboard.writeText(author.handle!)}
                          >
                            {author.name}
                          </span>
                        </Tooltip>
                      ) : (
                        <span>{author.name}</span>
                      )}
                      {index < arr.length - 1 && ', '}
                    </span>
                  ))}
                </p>
              </div>

              {/* External links */}
              <div className="flex items-center gap-2">
                {eip.discussionLink && (
                  <Tooltip text="View discussion">
                    <a
                      href={eip.discussionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleExternalLinkClick('discussion', eip.discussionLink)}
                      className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      <div className="relative w-7 h-7">
                        <img
                          src="/eth-mag.png"
                          alt="Ethereum Magicians"
                          className="w-7 h-7 opacity-90 dark:opacity-70"
                        />
                      </div>
                    </a>
                  </Tooltip>
                )}
                <Tooltip text="View specification">
                  <a
                    href={getSpecificationUrl(eip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleExternalLinkClick('specification', getSpecificationUrl(eip))}
                    className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  >
                    <div className="relative w-7 h-7">
                      <img
                        src="/eth-diamond-black.png"
                        alt="Ethereum"
                        className="w-7 h-7 opacity-90 dark:opacity-100 dark:invert"
                      />
                    </div>
                  </a>
                </Tooltip>
              </div>
            </div>

            {/* Description */}
            <p className="mt-4 text-slate-700 dark:text-slate-300 leading-relaxed">
              {parseMarkdownLinks(eip.laymanDescription || eip.description)}
            </p>

            {/* Breakout Call */}
            {breakoutCallInfo && (breakoutNav?.previous || upcomingCall) && (
              <div className="mt-4 flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{breakoutCallInfo.name}</span>
                </div>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <div className="flex items-center gap-3">
                  {breakoutNav?.previous && (
                    <Link
                      to={getBreakoutCallPath(breakoutNav.previous)}
                      className="text-purple-600 dark:text-purple-400 underline decoration-purple-300 dark:decoration-purple-700 underline-offset-2 hover:decoration-purple-500 dark:hover:decoration-purple-400 transition-colors"
                    >
                      Latest: Call #{parseInt(breakoutNav.previous.number, 10)}
                    </Link>
                  )}
                  {upcomingCall && (
                    <a
                      href={upcomingCall.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 underline decoration-purple-300 dark:decoration-purple-700 underline-offset-2 hover:decoration-purple-500 dark:hover:decoration-purple-400 transition-colors"
                    >
                      Upcoming: Call #{parseInt(upcomingCall.number, 10)}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </header>

          {/* Body Content */}
          <div className="p-6 space-y-8">
            {/* Timeline */}
            <EipTimeline eip={eip} />

            {/* Benefits */}
            {eip.benefits && eip.benefits.length > 0 && (
              <section className="bg-emerald-50/50 dark:bg-emerald-900/10 border-l-4 border-emerald-500 rounded-r-lg p-4">
                <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-3 uppercase tracking-wide">
                  Key Benefits
                </h3>
                <ul className="space-y-2">
                  {eip.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 text-xs">●</span>
                      <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Trade-offs */}
            {eip.tradeoffs && eip.tradeoffs.length > 0 ? (
              <section className="bg-amber-50/50 dark:bg-amber-900/10 border-l-4 border-amber-500 rounded-r-lg p-4">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3 uppercase tracking-wide">
                  Trade-offs & Considerations
                </h3>
                <ul className="space-y-2">
                  {eip.tradeoffs.map((tradeoff, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <span className="text-amber-600 dark:text-amber-400 mr-3 mt-0.5 text-xs">●</span>
                      <span className="text-slate-700 dark:text-slate-300">{tradeoff}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="bg-slate-50 dark:bg-slate-700/30 border-l-4 border-slate-300 dark:border-slate-600 rounded-r-lg p-4">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                  Trade-offs & Considerations
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  No trade-offs documented yet.
                </p>
              </section>
            )}

            {/* Stakeholder Impact */}
            {eip.stakeholderImpacts && Object.keys(eip.stakeholderImpacts).length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
                  Stakeholder Impact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(eip.stakeholderImpacts).map(([stakeholder, impact]) => {
                    const stakeholderNames: Record<string, string> = {
                      endUsers: 'End Users',
                      appDevs: 'Application Developers',
                      walletDevs: 'Wallet Developers',
                      toolingInfra: 'Tooling / Infrastructure',
                      layer2s: 'Layer 2s',
                      stakersNodes: 'Stakers & Node Operators',
                      clClients: 'CL Client Developers',
                      elClients: 'EL Client Developers',
                    };

                    return (
                      <div
                        key={stakeholder}
                        className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 overflow-hidden"
                      >
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 text-xs mb-1">
                          {stakeholderNames[stakeholder] || stakeholder}
                        </h4>
                        <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed break-words">
                          {impact.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* North Star Alignment */}
            {(eip.northStarAlignment?.scaleL1 ||
              eip.northStarAlignment?.scaleBlobs ||
              eip.northStarAlignment?.improveUX) && (
              <section className="bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-indigo-500 rounded-r-lg p-4">
                <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-3 uppercase tracking-wide">
                  North Star Goal Alignment
                </h3>
                <ul className="space-y-2">
                  {eip.northStarAlignment?.scaleL1 && (
                    <li className="flex items-start text-sm">
                      <span className="text-blue-600 dark:text-blue-400 mr-3 mt-0.5 text-xs">●</span>
                      <span>
                        <span className="font-medium text-blue-700 dark:text-blue-300">Scale L1:</span>{' '}
                        <span className="text-slate-700 dark:text-slate-300">{eip.northStarAlignment.scaleL1.description}</span>
                      </span>
                    </li>
                  )}
                  {eip.northStarAlignment?.scaleBlobs && (
                    <li className="flex items-start text-sm">
                      <span className="text-purple-600 dark:text-purple-400 mr-3 mt-0.5 text-xs">●</span>
                      <span>
                        <span className="font-medium text-purple-700 dark:text-purple-300">Scale Blobs:</span>{' '}
                        <span className="text-slate-700 dark:text-slate-300">{eip.northStarAlignment.scaleBlobs.description}</span>
                      </span>
                    </li>
                  )}
                  {eip.northStarAlignment?.improveUX && (
                    <li className="flex items-start text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 text-xs">●</span>
                      <span>
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">Improve UX:</span>{' '}
                        <span className="text-slate-700 dark:text-slate-300">{eip.northStarAlignment.improveUX.description}</span>
                      </span>
                    </li>
                  )}
                </ul>
              </section>
            )}
          </div>
        </article>

        {/* Previous/Next Navigation */}
        <nav className="mt-6 flex items-center justify-between">
          {prevEip ? (
            <Link
              to={`/eips/${prevEip.id}`}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-mono text-xs">{getProposalPrefix(prevEip)}-{prevEip.id}</span>
            </Link>
          ) : (
            <div />
          )}
          {nextEip ? (
            <Link
              to={`/eips/${nextEip.id}`}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors group"
            >
              <span className="font-mono text-xs">{getProposalPrefix(nextEip)}-{nextEip.id}</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <div />
          )}
        </nav>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400 space-y-3">
          <a
            href={`https://github.com/ethereum/forkcast/blob/main/src/data/eips/${eip.id}.json`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleExternalLinkClick('github_eip', `https://github.com/ethereum/forkcast/blob/main/src/data/eips/${eip.id}.json`)}
            className="inline-block text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
          <p>
            Feedback?{' '}
            <a
              href="mailto:nixo@ethereum.org"
              onClick={() => handleExternalLinkClick('email_contact', 'mailto:nixo@ethereum.org')}
              className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline"
            >
              nixo
            </a>
            {' '}or{' '}
            <a
              href="https://x.com/wolovim"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('twitter_contact', 'https://x.com/wolovim')}
              className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline"
            >
              @wolovim
            </a>
          </p>
        </footer>
      </div>

      {/* Search Modal */}
      <EipSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </div>
  );
};
