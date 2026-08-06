import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from '../navigation';
import { eipsData } from '../../data/eips';
import { useAnalytics } from '../../hooks/useAnalytics';
import {
  getProposalPrefix,
  buildDependentsMap,
} from '../../utils';
import { EipSearch } from './EipSearch';
import EipSearchModal from './EipSearchModal';
import { isSearchHotkey } from '../search/searchShortcuts';
import {
  eipCallTypes,
  callTypeNames,
  getCallNavigation,
} from '../../data/calls';
import { fetchUpcomingCalls, type UpcomingCall } from '../../domain/calls/upcomingCalls';
import { EipContent, type EipContentTab } from './EipContent';

const dependentsMap = buildDependentsMap(eipsData);

export const EipPage: React.FC<{ id: string }> = ({ id }) => {
  const navigate = useNavigate();
  const { trackLinkClick } = useAnalytics();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [upcomingCall, setUpcomingCall] = useState<UpcomingCall | null>(null);

  const eipId = parseInt(id || '', 10);
  const eip = eipsData.find((e) => e.id === eipId);
  const callType = eipCallTypes[eipId];
  const callNav = callType ? getCallNavigation(callType) : null;

  // Show analysis tab if the EIP has any analysis content
  const hasAnalysis = Boolean(
    eip && (
      eip.laymanDescription ||
      (eip.benefits && eip.benefits.length > 0) ||
      (eip.tradeoffs && eip.tradeoffs.length > 0) ||
      (eip.stakeholderImpacts && Object.keys(eip.stakeholderImpacts).length > 0) ||
      eip.northStarAlignment ||
      (eip.forkRelationships && eip.forkRelationships.length > 0)
    ),
  );

  const dependents = dependentsMap.get(eipId) || [];
  const hasDependents = dependents.length > 0;
  const hasFaq = Boolean(eip?.faq?.length);

  // View mode derived from URL ?tab= param
  const validTabs = ['analysis', 'spec', 'dependents', 'history', 'faq'] as const;
  type ViewMode = typeof validTabs[number];
  const defaultTab: ViewMode = hasAnalysis ? 'analysis' : 'spec';
  const tabParam = searchParams.get('tab') as ViewMode | null;
  const hasHash = typeof window !== 'undefined' && window.location.hash.length > 1;
  const hasQParam = searchParams.has('q');
  const hasFaqQuestionParam = tabParam === 'faq' && hasQParam && hasFaq;
  const isValidTab = tabParam && validTabs.includes(tabParam) && (tabParam !== 'dependents' || hasDependents) && (tabParam !== 'faq' || hasFaq);
  const initialTab: ViewMode = hasFaqQuestionParam ? 'faq' : isValidTab ? tabParam : hasHash ? 'spec' : defaultTab;

  const handleTabChange = useCallback((mode: EipContentTab) => {
    const next = new URLSearchParams(searchParams);
    if (mode === defaultTab) {
      next.delete('tab');
    } else {
      next.set('tab', mode);
    }
    if (mode !== 'faq') {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, defaultTab]);

  // Get sorted EIPs for navigation
  const sortedEips = useMemo(() => [...eipsData].sort((a, b) => a.id - b.id), []);
  const currentIndex = sortedEips.findIndex((e) => e.id === eipId);
  const prevEip = currentIndex > 0 ? sortedEips[currentIndex - 1] : null;
  const nextEip = currentIndex < sortedEips.length - 1 ? sortedEips[currentIndex + 1] : null;

  const tabBarRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (hasFaqQuestionParam && tabBarRef.current) {
      requestAnimationFrame(() => {
        tabBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch upcoming breakout call if this EIP has one
  useEffect(() => {
    if (callType) {
      fetchUpcomingCalls().then((calls) => {
        const upcoming = calls.find((c) => c.type === callType);
        setUpcomingCall(upcoming || null);
      });
    } else {
      setUpcomingCall(null);
    }
  }, [callType]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isSearchHotkey(e)) {
      e.preventDefault();
      setSearchModalOpen(true);
      return;
    }
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

  if (!eip) {
    return null;
  }

  const githubEipUrl = `https://github.com/ethereum/forkcast/blob/main/src/data/eips/${eip.id}.json`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Site Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
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
        </div>

        {/* Breakout Call Info (rendered above the card, outside EipContent) */}
        {callType && (callNav?.previous || upcomingCall) && (
          <div className="mb-4 flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{callTypeNames[callType]}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <div className="flex items-center gap-3">
              {callNav?.previous && (
                <Link
                  to={`/calls/${callNav.previous.path}`}
                  className="text-purple-600 dark:text-purple-400 underline decoration-purple-300 dark:decoration-purple-700 underline-offset-2 hover:decoration-purple-500 dark:hover:decoration-purple-400 transition-colors"
                >
                  Latest: Call #{parseInt(callNav.previous.number, 10)}
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

        <EipContent
          eip={eip}
          initialTab={initialTab}
          onTabChange={handleTabChange}
          tabBarRef={tabBarRef}
          scrollToHash
        />

        {/* Previous/Next Navigation + GitHub link */}
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
          <a
            href={githubEipUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackLinkClick('github_eip', githubEipUrl)}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
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
      </div>

      {/* Search Modal */}
      <EipSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </div>
  );
};
