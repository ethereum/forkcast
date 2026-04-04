import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { protocolCalls, callTypeNames, Call, type CallType } from '../../data/calls';
import { useMetaTags } from '../../hooks/useMetaTags';
import { KeyDecision, EIP } from '../../types/eip';
import { eipsData } from '../../data/eips';
import { networkUpgrades } from '../../data/upgrades';
import { getPendingProposalsForFork, type PendingProposal } from '../../data/pending-proposals';
import { fetchUpcomingCalls, type UpcomingCall } from '../../utils/github';
import { StructuredDecisionContent, EipLinkWithTooltip } from './KeyDecisionsSection';

interface TldrData {
  meeting: string;
  highlights: { [category: string]: { timestamp: string; highlight: string }[] };
  action_items: { timestamp: string; action: string; owner: string }[];
  decisions: { timestamp: string; decision: string }[];
  targets: { timestamp: string; target: string }[];
}

interface CallTldr {
  call: Call;
  tldrData: TldrData;
  keyDecisions?: KeyDecision[];
}

interface OpenActionItem {
  action: string;
  owner: string;
  source_call: string;
  source_date: string;
  notes: string | null;
}

interface ResolvedActionItem {
  action: string;
  owner: string;
  source_call: string;
  source_date: string;
  resolved_in: string;
  resolution: string;
}

interface OpenActionItemsData {
  series: string;
  generated: string;
  lookback_calls: string[];
  open_items: OpenActionItem[];
  resolved_items: ResolvedActionItem[];
}

interface AgendaSuggestion {
  topic: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
  related_eips: number[];
  source: string;
}

interface AgendaSuggestionsData {
  series: string;
  generated: string;
  for_call: string;
  suggestions: AgendaSuggestion[];
}

interface DeferredDecision {
  topic: string;
  deferred_in: string;
  deferred_date: string;
  expected_revisit: string | null;
  revisited: boolean;
  revisited_in: string | null;
  outcome: string | null;
}

interface DeferredDecisionsData {
  series: string;
  generated: string;
  lookback_calls: string[];
  deferred: DeferredDecision[];
}

interface EipThread {
  eip: number;
  title: string;
  fork: string;
  stage: string;
  thread: { call: string; date: string; summary: string }[];
  current_state: string;
  open_questions: string[];
}

interface EipThreadsData {
  series: string;
  generated: string;
  lookback_calls: string[];
  eip_threads: EipThread[];
}

interface PendingEip {
  eip: EIP;
  forkName: string;
  currentStatus: string;
  lastDiscussedDate: string | null;
  lastDiscussedCall: string | null;
}

const CALL_TYPE_LAYER: Record<string, 'EL' | 'CL'> = {
  acde: 'EL',
  acdc: 'CL',
};

const STATUS_TAG_COLORS: Record<string, string> = {
  Proposed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  Considered: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  Scheduled: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  Candidate: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300',
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const getCountdownText = (dateStr: string): string => {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  return `in ${diffDays} days`;
};

const SERIES_OPTIONS = [
  { key: 'acde', label: 'ACDE' },
  { key: 'acdc', label: 'ACDC' },
  { key: 'acdt', label: 'ACDT' },
] as const;

type SeriesKey = typeof SERIES_OPTIONS[number]['key'];

const CallPlanPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesParam = searchParams.get('series') as SeriesKey | null;
  const type = seriesParam && SERIES_OPTIONS.some(o => o.key === seriesParam) ? seriesParam : 'acde';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [callTldrs, setCallTldrs] = useState<CallTldr[]>([]);
  const [nextCall, setNextCall] = useState<UpcomingCall | null>(null);
  const [openActionItems, setOpenActionItems] = useState<OpenActionItemsData | null>(null);
  const [deferredDecisions, setDeferredDecisions] = useState<DeferredDecisionsData | null>(null);
  const [agendaSuggestions, setAgendaSuggestions] = useState<AgendaSuggestionsData | null>(null);
  const [eipThreads, setEipThreads] = useState<EipThreadsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSeriesChange = (key: SeriesKey) => {
    setSearchParams({ series: key });
    setIsDropdownOpen(false);
  };

  const currentSeries = SERIES_OPTIONS.find(o => o.key === type)!;
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    agenda: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isSectionOpen = (key: string) => {
    if (key in expandedSections) return expandedSections[key];
    // Sub-sections (CFI, PFI, Candidates) default open
    if (key.startsWith('cfi-') || key.startsWith('pfi-') || key.startsWith('candidates-')) return true;
    return false;
  };

  const typeLabel = type ? (callTypeNames[type as CallType] || type.toUpperCase()) : '';

  const eipMap = useMemo(() => {
    const map = new Map<number, EIP>();
    for (const eip of eipsData) {
      map.set(eip.id, eip);
    }
    return map;
  }, []);

  // Compute EIPs pending discussion for active upgrades
  const { pendingEips, pendingProposals } = useMemo(() => {
    const activeUpgrades = networkUpgrades.filter(
      u => u.status === 'Upcoming' || u.status === 'Planning'
    );
    const layerFilter = type ? CALL_TYPE_LAYER[type] : null;

    const eips: PendingEip[] = [];
    for (const upgrade of activeUpgrades) {
      for (const eip of eipsData) {
        // Layer filter: for ACDE show EL, for ACDC show CL, otherwise show all
        if (layerFilter && eip.layer && eip.layer !== layerFilter) continue;

        const forkDisplayName = upgrade.name.replace(' Upgrade', '');
        const fr = eip.forkRelationships.find(
          r => r.forkName.toLowerCase() === forkDisplayName.toLowerCase()
            || r.forkName.toLowerCase() === upgrade.id.toLowerCase()
        );
        if (!fr) continue;

        if (fr.statusHistory.length > 0) {
          const latest = fr.statusHistory[fr.statusHistory.length - 1];
          if (!['Proposed', 'Considered'].includes(latest.status)) continue;

          eips.push({
            eip,
            forkName: forkDisplayName,
            currentStatus: latest.status,
            lastDiscussedDate: latest.date,
            lastDiscussedCall: latest.call,
          });
        } else if ((fr.isHeadliner || fr.wasHeadlinerCandidate) && upgrade.status === 'Planning') {
          // Headliner candidates without formal PFI/CFI status
          const lastPresentation = fr.presentationHistory?.[fr.presentationHistory.length - 1];
          eips.push({
            eip,
            forkName: forkDisplayName,
            currentStatus: 'Candidate',
            lastDiscussedDate: lastPresentation?.date ?? null,
            lastDiscussedCall: lastPresentation?.call ?? null,
          });
        }
      }
    }

    eips.sort((a, b) => {
      const statusOrder = { Considered: 0, Proposed: 1, Candidate: 2 };
      const aOrder = statusOrder[a.currentStatus as keyof typeof statusOrder] ?? 2;
      const bOrder = statusOrder[b.currentStatus as keyof typeof statusOrder] ?? 2;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.eip.id - b.eip.id;
    });

    const proposals: (PendingProposal & { displayForkName: string })[] = [];
    for (const upgrade of activeUpgrades) {
      const displayForkName = upgrade.name.replace(' Upgrade', '');
      // Try both the display name and the id (handles accent mismatches like Hegotá vs Hegota)
      const forkProposals = [
        ...getPendingProposalsForFork(displayForkName),
        ...getPendingProposalsForFork(upgrade.id),
      ].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
      const filtered = layerFilter
        ? forkProposals.filter(p => p.layer === layerFilter)
        : forkProposals;
      proposals.push(...filtered.map(p => ({ ...p, displayForkName })));
    }

    return { pendingEips: eips, pendingProposals: proposals };
  }, [type]);

  useMetaTags({
    title: `${typeLabel} Agenda Planner - Forkcast`,
    description: `Action items, decisions, and targets from recent ${typeLabel} calls to help plan agendas.`,
    url: `https://forkcast.org/agenda?series=${type}`,
  });

  useEffect(() => {
    if (!type) {
      setLoading(false);
      return;
    }

    // Reset state when series changes
    setLoading(true);
    setNextCall(null);
    setOpenActionItems(null);
    setDeferredDecisions(null);
    setAgendaSuggestions(null);
    setEipThreads(null);
    setCallTldrs([]);
    setExpandedSections({ agenda: true });

    const fetchData = async () => {
      // Fetch upcoming call (non-blocking)
      fetchUpcomingCalls()
        .then(calls => {
          const match = calls.find(c => c.type === type);
          if (match) setNextCall(match);
        })
        .catch(() => {});

      // Fetch plan artifacts (non-blocking)
      fetch(`/artifacts/${type}/plan/open_action_items.json`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setOpenActionItems(data); })
        .catch(() => {});

      fetch(`/artifacts/${type}/plan/deferred_decisions.json`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setDeferredDecisions(data); })
        .catch(() => {});

      fetch(`/artifacts/${type}/plan/agenda_suggestions.json`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setAgendaSuggestions(data); })
        .catch(() => {});

      fetch(`/artifacts/${type}/plan/eip_threads.json`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setEipThreads(data); })
        .catch(() => {});

      // Fetch recent call TLDRs
      const typeCalls = protocolCalls
        .filter(c => c.type === type)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

      const results = await Promise.allSettled(
        typeCalls.map(async (call) => {
          const artifactPath = `${call.type}/${call.date}_${call.number}`;

          const tldrResponse = await fetch(`/artifacts/${artifactPath}/tldr.json`);
          if (!tldrResponse.ok) return null;
          const text = await tldrResponse.text();
          if (text.trimStart().startsWith('<!')) return null;
          const tldrData: TldrData = JSON.parse(text);

          let keyDecisions: KeyDecision[] | undefined;
          try {
            const kdResponse = await fetch(`/artifacts/${artifactPath}/key_decisions.json`);
            if (kdResponse.ok) {
              const kdData = await kdResponse.json();
              if (kdData?.key_decisions?.length > 0) {
                keyDecisions = kdData.key_decisions;
              }
            }
          } catch {
            // fall back to tldr decisions
          }

          const hasContent =
            (tldrData.action_items?.length > 0) ||
            (tldrData.decisions?.length > 0) ||
            (keyDecisions && keyDecisions.length > 0) ||
            (tldrData.targets?.length > 0);
          if (!hasContent) return null;
          const result: CallTldr = { call, tldrData };
          if (keyDecisions) result.keyDecisions = keyDecisions;
          return result;
        })
      );

      const resolved: CallTldr[] = results
        .filter((r): r is PromiseFulfilledResult<CallTldr | null> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter((m): m is CallTldr => m !== null);

      setCallTldrs(resolved);
      setLoading(false);
    };

    fetchData();
  }, [type]);

  // Shared chevron SVG for section headers
  const SectionChevron = ({ isOpen }: { isOpen: boolean }) => (
    <svg
      className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} shrink-0`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M6.293 4.293a1 1 0 011.414 0L14 10.586l-6.293 6.293a1 1 0 01-1.414-1.414L11.172 10.5 6.293 5.707a1 1 0 010-1.414z" />
    </svg>
  );

  // Shared sub-chevron for nested collapsibles
  const SubChevron = ({ isOpen, size = 'w-3 h-3' }: { isOpen: boolean; size?: string }) => (
    <svg
      className={`${size} text-slate-400 dark:text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} shrink-0`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M6.293 4.293a1 1 0 011.414 0L14 10.586l-6.293 6.293a1 1 0 01-1.414-1.414L11.172 10.5 6.293 5.707a1 1 0 010-1.414z" />
    </svg>
  );

  const sectionCard = 'rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/30';
  const sectionHeader = 'cursor-pointer px-4 py-3 flex items-center gap-2.5';
  const sectionBody = 'px-4 pb-4 border-t border-slate-100 dark:border-slate-700/30';
  const sectionTitle = 'text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide';
  const sectionMeta = 'text-xs text-slate-400 dark:text-slate-400';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            <span className="font-normal opacity-80">Agenda Planner for</span>{' '}
            <div className="inline-block relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="font-bold border-b-2 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:border-purple-400 dark:hover:border-purple-500 transition-colors inline-flex items-baseline gap-1"
              >
                {currentSeries.label}
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-lg py-1 min-w-[160px] z-10">
                  {SERIES_OPTIONS.map(option => (
                    <button
                      key={option.key}
                      onClick={() => handleSeriesChange(option.key)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        option.key === type
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Planning context from recent {typeLabel} calls.
          </p>
        </div>

        {/* Next Call Card */}
        {nextCall && (
          <div className="mb-5 rounded-lg border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-900/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Next: {typeLabel} #{nextCall.number}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formatDate(nextCall.date)}
                  <span className="ml-2 text-purple-600 dark:text-purple-400 font-medium">
                    {getCountdownText(nextCall.date)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={nextCall.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-full px-3 py-1.5 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  Agenda #{nextCall.issueNumber}
                </a>
                {nextCall.youtubeUrl && (
                  <a
                    href={nextCall.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-full px-3 py-1.5 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    YouTube
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Section 1: Suggested Agenda */}
          {agendaSuggestions && agendaSuggestions.suggestions.length > 0 && (
            <div className={sectionCard}>
              <button onClick={() => toggleSection('agenda')} className={sectionHeader}>
                <SectionChevron isOpen={isSectionOpen('agenda')} />
                <h2 className={sectionTitle}>Suggested Agenda</h2>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  for {agendaSuggestions.for_call}
                </span>
                <span className={`${sectionMeta} ml-auto`}>
                  {agendaSuggestions.suggestions.length} topics
                </span>
              </button>
              <div className={`grid transition-all duration-300 ease-in-out ${
                isSectionOpen('agenda') ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}>
                <div className="overflow-hidden">
                  <div className={sectionBody}>
                    <div className="space-y-3 pt-3">
                      {agendaSuggestions.suggestions.map((suggestion, index) => (
                        <div key={index} className="text-sm flex gap-2.5">
                          <span className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${
                            suggestion.priority === 'high'
                              ? 'bg-red-500 dark:bg-red-400'
                              : suggestion.priority === 'medium'
                                ? 'bg-amber-500 dark:bg-amber-400'
                                : 'bg-slate-300 dark:bg-slate-600'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <span className="text-slate-800 dark:text-slate-200">{suggestion.topic}</span>
                            {suggestion.related_eips.length > 0 && (
                              <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400 inline-flex gap-1">
                                {suggestion.related_eips.map(id => (
                                  <EipLinkWithTooltip key={id} eipId={id} eipMap={eipMap} />
                                ))}
                              </span>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                              {suggestion.rationale}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className={`${sectionMeta} mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/30`}>
                      Generated {agendaSuggestions.generated}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Upgrade Scope */}
          {(pendingEips.length > 0 || pendingProposals.length > 0) && (() => {
            const cfiEips = pendingEips.filter(e => e.currentStatus === 'Considered');
            const pfiEips = pendingEips.filter(e => e.currentStatus === 'Proposed');
            const candidateEips = pendingEips.filter(e => e.currentStatus === 'Candidate');

            const hasAnyDates = pendingEips.some(e => e.lastDiscussedDate);

            const renderColumnHeader = () => hasAnyDates ? (
              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="ml-auto">Stage changed</span>
              </div>
            ) : null;

            // Build a lookup from eipThreads
            const threadMap = new Map<number, EipThread>();
            if (eipThreads) {
              for (const t of eipThreads.eip_threads) {
                threadMap.set(t.eip, t);
              }
            }

            const renderEipRow = ({ eip, lastDiscussedDate, lastDiscussedCall }: PendingEip) => {
              const thread = threadMap.get(eip.id);
              const hasThread = thread && (thread.thread.length > 0 || thread.open_questions.length > 0);
              const eipKey = `eip-${eip.id}`;
              const isOpen = isSectionOpen(eipKey);

              const rowContent = (
                <>
                  <EipLinkWithTooltip eipId={eip.id} eipMap={eipMap} />
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    {eip.title.replace(/^EIP-\d+:\s*/, '')}
                  </span>
                  {eip.layer && (
                    <span className={`text-xs px-1 rounded shrink-0 ${
                      eip.layer === 'EL'
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                        : 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400'
                    }`}>
                      {eip.layer}
                    </span>
                  )}
                  {lastDiscussedDate && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 ml-auto">
                      {lastDiscussedCall ? (
                        <Link
                          to={`/calls/${lastDiscussedCall}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        >
                          {lastDiscussedDate}
                        </Link>
                      ) : lastDiscussedDate}
                    </span>
                  )}
                </>
              );

              if (!hasThread) {
                return (
                  <div
                    key={eip.id}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                  >
                    <span className="w-2.5 shrink-0" />
                    {rowContent}
                  </div>
                );
              }

              return (
                <div key={eip.id}>
                  <button
                    onClick={() => toggleSection(eipKey)}
                    className="w-full cursor-pointer flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 text-left"
                  >
                    <svg
                      className={`w-2.5 h-2.5 text-slate-400 dark:text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} shrink-0`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.293 4.293a1 1 0 011.414 0L14 10.586l-6.293 6.293a1 1 0 01-1.414-1.414L11.172 10.5 6.293 5.707a1 1 0 010-1.414z" />
                    </svg>
                    {rowContent}
                  </button>
                  <div className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}>
                    <div className="overflow-hidden">
                      <div className="ml-5 mt-1 mb-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5">
                        {thread!.thread.map((entry, i) => (
                          <div key={i} className="text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-slate-600 dark:text-slate-300">{entry.call}</span>
                            <span className="mx-1">&mdash;</span>
                            {entry.summary}
                          </div>
                        ))}
                        {thread!.current_state && (
                          <div className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                            <span className="font-medium">Current:</span> {thread!.current_state}
                          </div>
                        )}
                        {thread!.open_questions.length > 0 && (
                          <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                            <span className="font-medium">Open:</span>{' '}
                            {thread!.open_questions.join(' \u2022 ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            };

            // Group by fork
            const forkNames = [...new Set([
              ...pendingEips.map(e => e.forkName),
              ...pendingProposals.map(p => p.displayForkName),
            ])];

            return forkNames.map(forkName => {
              const forkCfi = cfiEips.filter(e => e.forkName === forkName);
              const forkPfi = pfiEips.filter(e => e.forkName === forkName);
              const forkCandidates = candidateEips.filter(e => e.forkName === forkName);
              const forkDrafts = pendingProposals.filter(p => p.displayForkName === forkName);
              if (forkCfi.length === 0 && forkPfi.length === 0 && forkCandidates.length === 0 && forkDrafts.length === 0) return null;

              const totalEips = forkCfi.length + forkPfi.length + forkCandidates.length + forkDrafts.length;

              const scopeKey = `scope-${forkName.toLowerCase()}`;
              return (
                <div key={forkName} className={sectionCard}>
                  <button onClick={() => toggleSection(scopeKey)} className={sectionHeader}>
                    <SectionChevron isOpen={isSectionOpen(scopeKey)} />
                    <h2 className={sectionTitle}>{forkName} Scope</h2>
                    <span className={`${sectionMeta} ml-auto`}>{totalEips} EIPs</span>
                  </button>
                  <div className={`grid transition-all duration-300 ease-in-out ${
                    isSectionOpen(scopeKey) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}>
                    <div className="overflow-hidden">
                      <div className={sectionBody}>
                        <div className="pt-3 pl-3 space-y-4">
                          {forkCfi.length > 0 && (() => {
                            const cfiKey = `cfi-${forkName.toLowerCase()}`;
                            return (
                              <div>
                                <button onClick={() => toggleSection(cfiKey)} className="cursor-pointer flex items-center gap-2 mb-2">
                                  <SubChevron isOpen={isSectionOpen(cfiKey)} size="w-3 h-3" />
                                  <span className={`inline-flex items-center px-1.5 rounded text-xs font-medium ${STATUS_TAG_COLORS['Considered']}`}>
                                    CFI
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {forkCfi.length} EIP{forkCfi.length !== 1 ? 's' : ''}
                                  </span>
                                </button>
                                <div className={`grid transition-all duration-300 ease-in-out ${
                                  isSectionOpen(cfiKey) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                }`}>
                                  <div className="overflow-hidden">
                                    <div className="space-y-1.5 pl-5">
                                      {renderColumnHeader()}
                                      {forkCfi.map(renderEipRow)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {forkPfi.length > 0 && (() => {
                            const pfiKey = `pfi-${forkName.toLowerCase()}`;
                            return (
                              <div>
                                <button onClick={() => toggleSection(pfiKey)} className="cursor-pointer flex items-center gap-2 mb-2">
                                  <SubChevron isOpen={isSectionOpen(pfiKey)} size="w-3 h-3" />
                                  <span className={`inline-flex items-center px-1.5 rounded text-xs font-medium ${STATUS_TAG_COLORS['Proposed']}`}>
                                    PFI
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {forkPfi.length} EIP{forkPfi.length !== 1 ? 's' : ''}
                                  </span>
                                </button>
                                <div className={`grid transition-all duration-300 ease-in-out ${
                                  isSectionOpen(pfiKey) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                }`}>
                                  <div className="overflow-hidden">
                                    <div className="space-y-1.5 pl-5">
                                      {renderColumnHeader()}
                                      {forkPfi.map(renderEipRow)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {(forkCandidates.length > 0 || forkDrafts.length > 0) && (() => {
                            const totalCandidates = forkCandidates.length + forkDrafts.length;
                            const candidatesKey = `candidates-${forkName.toLowerCase()}`;
                            return (
                              <div>
                                <button onClick={() => toggleSection(candidatesKey)} className="cursor-pointer flex items-center gap-2 mb-2">
                                  <SubChevron isOpen={isSectionOpen(candidatesKey)} size="w-3 h-3" />
                                  <span className={`inline-flex items-center px-1.5 rounded text-xs font-medium ${STATUS_TAG_COLORS['Candidate']}`}>
                                    Headliner Candidates
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {totalCandidates}
                                  </span>
                                </button>
                                <div className={`grid transition-all duration-300 ease-in-out ${
                                  isSectionOpen(candidatesKey) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                }`}>
                                  <div className="overflow-hidden">
                                    <div className="space-y-1.5 pl-5">
                                      {forkCandidates.map(renderEipRow)}
                                      {forkDrafts.map((proposal) => (
                                        <div
                                          key={proposal.id}
                                          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                                        >
                                          <a
                                            href={proposal.forumLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                            style={{ borderBottom: '1px dotted currentColor' }}
                                          >
                                            {proposal.title}
                                          </a>
                                          <span className={`text-xs px-1 rounded shrink-0 ${
                                            proposal.layer === 'EL'
                                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                                              : 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400'
                                          }`}>
                                            {proposal.layer}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}

          {/* Section 3: Open Action Items */}
          {openActionItems && openActionItems.open_items.length > 0 && (
            <div className={sectionCard}>
              <button onClick={() => toggleSection('actions')} className={sectionHeader}>
                <SectionChevron isOpen={isSectionOpen('actions')} />
                <h2 className={sectionTitle}>Open Action Items</h2>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {openActionItems.open_items.length} open
                </span>
                <span className={`${sectionMeta} ml-auto`}>
                  across {openActionItems.lookback_calls.length} calls
                </span>
              </button>
              <div className={`grid transition-all duration-300 ease-in-out ${
                isSectionOpen('actions') ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}>
                <div className="overflow-hidden">
                  <div className={sectionBody}>
                    <div className="space-y-2.5 pt-3">
                      {openActionItems.open_items.map((item, index) => (
                        <div
                          key={index}
                          className="text-sm text-slate-600 dark:text-slate-400 flex gap-2"
                        >
                          <span className="text-amber-500 shrink-0 mt-0.5">&#9744;</span>
                          <div className="flex-1 min-w-0">
                            <span className="inline-block text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded px-1.5 py-0.5 mr-1.5">
                              {item.owner}
                            </span>
                            {item.action}
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                              from {item.source_call}
                            </span>
                            {item.notes && (
                              <span className="ml-1 text-xs text-slate-400 dark:text-slate-400 italic">
                                &mdash; {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className={`${sectionMeta} mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/30`}>
                      Generated {openActionItems.generated}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Deferred Decisions */}
          {deferredDecisions && (() => {
            const pending = deferredDecisions.deferred.filter(d => !d.revisited);
            const revisited = deferredDecisions.deferred.filter(d => d.revisited);
            if (pending.length === 0 && revisited.length === 0) return null;

            return (
              <div className={sectionCard}>
                <button onClick={() => toggleSection('deferred')} className={sectionHeader}>
                  <SectionChevron isOpen={isSectionOpen('deferred')} />
                  <h2 className={sectionTitle}>Deferred Decisions</h2>
                  {pending.length > 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {pending.length} pending
                    </span>
                  )}
                  <span className={`${sectionMeta} ml-auto`}>
                    {deferredDecisions.deferred.length} total
                  </span>
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${
                  isSectionOpen('deferred') ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}>
                  <div className="overflow-hidden">
                    <div className={sectionBody}>
                      <div className="space-y-2.5 pt-3">
                        {pending.map((item, index) => (
                          <div
                            key={`p-${index}`}
                            className="text-sm text-slate-600 dark:text-slate-400 flex gap-2"
                          >
                            <span className="text-amber-500 shrink-0 mt-0.5">&#9888;</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-slate-800 dark:text-slate-200">{item.topic}</span>
                              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                deferred in {item.deferred_in}
                              </span>
                              {item.expected_revisit && (
                                <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                                  &mdash; expected: {item.expected_revisit}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {revisited.length > 0 && (() => {
                          const revisitedOpen = isSectionOpen('revisited');
                          return (
                            <div className="mt-1">
                              <button onClick={() => toggleSection('revisited')} className="cursor-pointer text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <SubChevron isOpen={revisitedOpen} size="w-2.5 h-2.5" />
                                {revisited.length} revisited
                              </button>
                              <div className={`grid transition-all duration-300 ease-in-out ${
                                revisitedOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                              }`}>
                                <div className="overflow-hidden">
                                  <div className="space-y-2 mt-2 pl-4">
                                    {revisited.map((item, index) => (
                                      <div
                                        key={`r-${index}`}
                                        className="text-sm text-slate-500 dark:text-slate-400 flex gap-2"
                                      >
                                        <span className="text-emerald-500 shrink-0 mt-0.5">&#10003;</span>
                                        <div className="flex-1 min-w-0">
                                          <span className="text-slate-600 dark:text-slate-400">{item.topic}</span>
                                          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                                            {item.deferred_in} &rarr; {item.revisited_in}
                                          </span>
                                          {item.outcome && (
                                            <span className="ml-1 text-xs text-slate-400 dark:text-slate-500 italic">
                                              &mdash; {item.outcome}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                  </div>
                      <p className={`${sectionMeta} mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/30`}>
                        Generated {deferredDecisions.generated}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Loading spinner */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          )}

          {/* Section 5: Recent Calls */}
          {!loading && callTldrs.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-10 text-center">
              No summary data available for recent {typeLabel} calls.
            </p>
          )}

          {!loading && callTldrs.length > 0 && (
            <div className={`${sectionCard} overflow-hidden`}>
              <button onClick={() => toggleSection('recent')} className={sectionHeader}>
                <SectionChevron isOpen={isSectionOpen('recent')} />
                <h2 className={sectionTitle}>Recent Calls</h2>
                <span className={`${sectionMeta} ml-auto`}>{callTldrs.length} calls</span>
              </button>
              <div className={`grid transition-all duration-300 ease-in-out ${
                isSectionOpen('recent') ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}>
                <div className="overflow-hidden">
                  <div className="border-t border-slate-100 dark:border-slate-700/30">
                    {callTldrs.map(({ call, tldrData, keyDecisions }, callIndex) => {
                      const callKey = `call-${call.type}-${call.number}`;
                      // Default first 2 calls open
                      if (callIndex < 2 && !(callKey in expandedSections)) {
                        expandedSections[callKey] = true;
                      }
                      const isOpen = isSectionOpen(callKey);
                      const hasKeyDecisions = keyDecisions && keyDecisions.length > 0;
                      const hasDecisions = hasKeyDecisions || (tldrData.decisions && tldrData.decisions.length > 0);
                      return (
                        <div
                          key={`${call.type}-${call.number}`}
                          className="border-t border-slate-100 dark:border-slate-700/30 first:border-t-0"
                        >
                          <button onClick={() => toggleSection(callKey)} className="cursor-pointer w-full px-4 py-3 flex items-center gap-3 text-left">
                            <SectionChevron isOpen={isOpen} />
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {typeLabel} #{call.number}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-400">
                              {formatDate(call.date)}
                            </span>
                            <Link
                              to={`/calls/${call.type}/${call.number}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-slate-400 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 transition-colors ml-auto"
                            >
                              view call
                            </Link>
                          </button>
                          <div className={`grid transition-all duration-300 ease-in-out ${
                            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          }`}>
                            <div className="overflow-hidden">
                              <div className="pb-4 px-4 pl-11 space-y-5">
                                {/* Decisions */}
                                {hasDecisions && (
                                  <div className="rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 p-3">
                                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide mb-2">
                                      Decisions
                                    </h3>
                                    {hasKeyDecisions ? (
                                      <ul className="space-y-1.5 list-none ml-0">
                                        {keyDecisions.map((decision, index) => {
                                          const isStructured = decision.type !== 'other';
                                          return (
                                            <li
                                              key={index}
                                              className="text-sm before:content-['\2192'] before:mr-2 before:text-slate-400 dark:before:text-slate-500 text-slate-600 dark:text-slate-400"
                                            >
                                              {isStructured
                                                ? <StructuredDecisionContent decision={decision} eipMap={eipMap} />
                                                : decision.original_text
                                              }
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    ) : (
                                      <ul className="space-y-1 list-none ml-0">
                                        {tldrData.decisions.map((decision, index) => (
                                          <li
                                            key={index}
                                            className="text-sm before:content-['\2192'] before:mr-2 before:text-slate-400 dark:before:text-slate-500 text-slate-600 dark:text-slate-400"
                                          >
                                            {decision.decision}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )}

                                {/* Action Items */}
                                {tldrData.action_items && tldrData.action_items.length > 0 && (
                                  <div>
                                    <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
                                      Action Items
                                    </h3>
                                    <ul className="space-y-1.5 list-none ml-0">
                                      {tldrData.action_items.map((item, index) => (
                                        <li
                                          key={index}
                                          className="text-sm text-slate-600 dark:text-slate-400 flex gap-2"
                                        >
                                          <span className="text-amber-500 shrink-0 mt-0.5">&#9744;</span>
                                          <span>
                                            <span className="inline-block text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded px-1.5 py-0.5 mr-1.5">
                                              {item.owner}
                                            </span>
                                            {item.action}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Targets */}
                                {tldrData.targets && tldrData.targets.length > 0 && (
                                  <div>
                                    <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">
                                      Targets
                                    </h3>
                                    <ul className="space-y-1.5 list-none ml-0">
                                      {tldrData.targets.map((target, index) => (
                                        <li
                                          key={index}
                                          className="text-sm text-slate-600 dark:text-slate-400 flex gap-2"
                                        >
                                          <span className="text-blue-400 dark:text-blue-500 shrink-0">&#9673;</span>
                                          {target.target}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallPlanPage;
