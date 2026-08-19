/**
 * The lazy chunk behind global search. Owns query/scope/filter state and stitches
 * the pure search modules in `src/domain/search/` together.
 *
 * Data arrives progressively — EIPs (a ~630 KB dynamic import) and the light
 * corpus (a fetch) both land after the modal is already interactive, and the
 * heavy transcript tier only after an explicit opt-in. Every section is therefore
 * computed from whatever is loaded so far and re-derived when more shows up.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { protocolCalls } from '../../data/calls';
import { searchCallEntities } from '../../domain/search/callEntitySearch';
import {
  EMPTY_EIP_FILTERS,
  mergeSpecResults,
  searchEips,
  toEipResults,
  type EipSearchFilters,
  type EipSearchResult,
} from '../../domain/search/eipSearch';
import {
  EMPTY_TRANSCRIPT_FILTERS,
  activateHeavyTier,
  isHeavyTierActivated,
  searchHeavyTier,
  type TranscriptFilters,
} from '../../domain/search/heavyTier';
import { loadEips } from '../../domain/search/loadEips';
import { loadLightCorpus } from '../../domain/search/lightCorpus';
import {
  EMPTY_SUMMARY_FILTERS,
  searchLightCorpus,
  type SummaryFilters,
} from '../../domain/search/lightCorpusSearch';
import { firstSelectableIndex, moveIndex } from '../../domain/search/keyboardNav';
import { SECTION_SCOPE, capSections, flattenSections, orderSections } from '../../domain/search/ranking';
import { buildSiteEntities, searchSiteEntities } from '../../domain/search/siteSearch';
import type {
  GlobalResult,
  LightEntry,
  RowAction,
  SearchScope,
  SectionId,
  SectionResults,
  TranscriptResult,
} from '../../domain/search/types';
import { useNavigate } from '../navigation';
import GlobalSearchFilters from './GlobalSearchFilters';
import GlobalSearchResults from './GlobalSearchResults';
import { SearchDialog, SearchDialogSearchRow, SearchEmptyState, SearchFilterButton, SearchKeycap } from './SearchUi';

interface Props {
  isOpen: boolean;
  initialScope?: SearchScope;
  initialQuery?: string;
  onClose: () => void;
}

const SCOPES: Array<{ id: SearchScope; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'eips', label: 'EIPs' },
  { id: 'calls', label: 'Calls' },
  { id: 'transcripts', label: 'Transcripts' },
  { id: 'site', label: 'Site' },
];

type EipsModule = Awaited<ReturnType<typeof loadEips>>;

const section = (id: SectionId, results: GlobalResult[]): SectionResults => ({
  id,
  results,
  total: results.length,
});

export default function GlobalSearchModal({ isOpen, initialScope, initialQuery = '', onClose }: Props) {
  const navigate = useNavigate();

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [scope, setScope] = useState<SearchScope>(initialScope ?? 'all');
  const [eipFilters, setEipFilters] = useState<EipSearchFilters>(EMPTY_EIP_FILTERS);
  const [summaryFilters, setSummaryFilters] = useState<SummaryFilters>(EMPTY_SUMMARY_FILTERS);
  const [transcriptFilters, setTranscriptFilters] = useState<TranscriptFilters>(EMPTY_TRANSCRIPT_FILTERS);

  const [eips, setEips] = useState<EipsModule | null>(null);
  const [entries, setEntries] = useState<LightEntry[] | null>(null);
  const [specHits, setSpecHits] = useState<{ eipId: number; score: number }[]>([]);
  const [transcriptsOn, setTranscriptsOn] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptResult[]>([]);
  const [transcriptsLoading, setTranscriptsLoading] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);
  // Mouse movement over a row only takes over the selection when the user isn't
  // driving with the keyboard — otherwise scrolling a row under the cursor steals it.
  const lastInputWasKeyboard = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // A reopen carries a fresh scope/query from the nav or a page trigger. The modal
  // stays mounted between opens, so everything it accumulated has to be cleared
  // here — a filter left over from a previous open would silently narrow results.
  useEffect(() => {
    if (!isOpen) return;
    setScope(initialScope ?? 'all');
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
    setEipFilters(EMPTY_EIP_FILTERS);
    setSummaryFilters(EMPTY_SUMMARY_FILTERS);
    setTranscriptFilters(EMPTY_TRANSCRIPT_FILTERS);
    setTranscriptsOn(isHeavyTierActivated());
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen, initialScope, initialQuery]);

  useEffect(() => {
    if (!isOpen) return;
    loadEips().then(setEips, () => {});
    loadLightCorpus().then(setEntries, () => {});
  }, [isOpen]);

  // Self-cancelling rather than a `debounce` helper: closing mid-flight has to
  // drop the pending update, or it lands after `close()` cleared the query and
  // the next open paints a frame of the previous search's results.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Spec-index hits arrive after metadata results, and only boost them.
  useEffect(() => {
    let cancelled = false;
    if (debouncedQuery.trim().length < 2) {
      setSpecHits([]);
      return;
    }
    import('../../services/eipSpecSearch')
      .then(({ eipSpecSearchService }) => eipSpecSearchService.search(debouncedQuery))
      .then((hits) => {
        if (!cancelled) setSpecHits(hits);
      })
      .catch(() => {
        if (!cancelled) setSpecHits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    if (!transcriptsOn) {
      setTranscripts([]);
      return;
    }
    let cancelled = false;
    setTranscriptsLoading(true);
    searchHeavyTier(debouncedQuery, transcriptFilters)
      .then((results) => {
        if (!cancelled) setTranscripts(results);
      })
      .catch(() => {
        if (!cancelled) setTranscripts([]);
      })
      .finally(() => {
        if (!cancelled) setTranscriptsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [transcriptsOn, debouncedQuery, transcriptFilters]);

  const siteEntities = useMemo(() => buildSiteEntities(), []);
  const summaryCallTypes = useMemo(
    () => [...new Set((entries ?? []).map((entry) => entry.callType))].sort(),
    [entries],
  );

  const terms = useMemo(
    () => debouncedQuery.toLowerCase().trim().split(/\s+/).filter(Boolean),
    [debouncedQuery],
  );

  const eipResults = useMemo<GlobalResult[]>(() => {
    if (!eips) return [];
    const hasFilters =
      eipFilters.forkName !== 'all' || eipFilters.forkStatus !== 'all' || eipFilters.layer !== 'all';
    if (terms.length === 0 && !hasFilters) return [];

    const metadata = searchEips(debouncedQuery, eips.eipsData, eipFilters);
    const merged: EipSearchResult[] =
      terms.length > 0 && specHits.length > 0
        ? mergeSpecResults(metadata, specHits, eips.eipById, eipFilters)
        : metadata;

    return toEipResults(merged, terms);
  }, [eips, debouncedQuery, eipFilters, specHits, terms]);

  const sections = useMemo(() => {
    const siteResults = searchSiteEntities(debouncedQuery, siteEntities);
    const byGroup = (group: 'upgrades' | 'networks' | 'pages') =>
      siteResults.filter((result) => result.entity.group === group);

    const all: SectionResults[] = [
      section('eips', eipResults),
      section('calls', searchCallEntities(debouncedQuery, protocolCalls)),
      section('summaries', searchLightCorpus(debouncedQuery, entries ?? [], summaryFilters)),
      section('upgrades', byGroup('upgrades')),
      section('networks', byGroup('networks')),
      section('pages', byGroup('pages')),
      section('transcripts', transcripts),
    ];

    const inScope = all.filter(
      (candidate) =>
        candidate.results.length > 0 && (scope === 'all' || SECTION_SCOPE[candidate.id] === scope),
    );

    return capSections(orderSections(inScope), scope === 'all');
  }, [debouncedQuery, siteEntities, eipResults, entries, summaryFilters, transcripts, scope]);

  const rows = useMemo(() => {
    const offerTranscripts =
      !transcriptsOn && debouncedQuery.trim().length >= 2 && (scope === 'all' || scope === 'transcripts');
    return flattenSections(sections, {
      transcriptAction: offerTranscripts ? 'Search call transcripts and chat' : undefined,
    });
  }, [sections, transcriptsOn, debouncedQuery, scope]);

  useEffect(() => {
    setActiveIndex(firstSelectableIndex(rows));
  }, [rows]);

  useEffect(() => {
    const element = containerRef.current?.querySelector(`[data-row-index="${activeIndex}"]`);
    element?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const close = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    onClose();
  }, [onClose]);

  const go = useCallback(
    (href: string) => {
      navigate(href);
      close();
    },
    [navigate, close],
  );

  const selectScope = useCallback(
    (next: SearchScope) => {
      if (next === 'transcripts' && !transcriptsOn) {
        activateHeavyTier();
        setTranscriptsOn(true);
      }
      if (next === scope) return;
      // Each filter group is only reachable from its own scope's chip, so leaving
      // that scope would strand it: still narrowing results, with no way to clear it.
      if (scope === 'eips') setEipFilters(EMPTY_EIP_FILTERS);
      if (scope === 'calls') setSummaryFilters(EMPTY_SUMMARY_FILTERS);
      if (scope === 'transcripts') setTranscriptFilters(EMPTY_TRANSCRIPT_FILTERS);
      setScope(next);
    },
    [scope, transcriptsOn],
  );

  const runAction = useCallback(
    (action: RowAction) => {
      selectScope(action.kind === 'expand-section' ? action.scope : 'transcripts');
    },
    [selectScope],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        lastInputWasKeyboard.current = true;
        setActiveIndex((current) => moveIndex(rows, current, event.key === 'ArrowDown' ? 1 : -1));
        return;
      }
      if (event.key === 'Enter') {
        const row = rows[activeIndex];
        if (!row) return;
        event.preventDefault();
        // Action rows change the view rather than leaving it, so they don't close.
        if (row.type === 'action') runAction(row.action);
        else if (row.type === 'result') go(row.result.href);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, rows, activeIndex, close, go, runAction]);

  const onHover = useCallback((index: number) => {
    if (lastInputWasKeyboard.current) {
      lastInputWasKeyboard.current = false;
      return;
    }
    setActiveIndex(index);
  }, []);

  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <SearchDialog isOpen={isOpen} onClose={close} query={query} maxWidthClassName="max-w-3xl">
      <div className="border-b border-slate-200 dark:border-slate-700">
        <SearchDialogSearchRow
          inputRef={inputRef}
          value={query}
          onChange={setQuery}
          placeholder="Search EIPs, calls, upgrades…"
          onClose={close}
          loading={transcriptsLoading}
        />

        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3">
          {SCOPES.map((item) => (
            <SearchFilterButton
              key={item.id}
              active={scope === item.id}
              onClick={() => selectScope(item.id)}
              tone="purple"
            >
              {item.label}
            </SearchFilterButton>
          ))}
        </div>

        <GlobalSearchFilters
          scope={scope}
          eipFilters={eipFilters}
          onEipFilters={setEipFilters}
          summaryFilters={summaryFilters}
          onSummaryFilters={setSummaryFilters}
          summaryCallTypes={summaryCallTypes}
          transcriptFilters={transcriptFilters}
          onTranscriptFilters={setTranscriptFilters}
        />

        {transcriptsOn && transcriptsLoading && (
          <div className="flex items-center gap-2 px-4 pb-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span>Building search index…</span>
          </div>
        )}
      </div>

      {rows.length > 0 ? (
        <GlobalSearchResults
          rows={rows}
          activeIndex={activeIndex}
          containerRef={containerRef}
          onHover={onHover}
          onNavigate={go}
          onAction={runAction}
        />
      ) : hasQuery ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          <p className="text-sm">No results for "{debouncedQuery}"</p>
          <p className="mt-2 text-xs">Try different keywords, or another scope</p>
        </div>
      ) : (
        <SearchEmptyState
          description="Search across Forkcast"
          items={['EIPs', 'Calls', 'Call summaries', 'Upgrades', 'Networks', 'Pages']}
        />
      )}

      {rows.length > 0 && (
        <div className="hidden items-center gap-4 border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:flex">
          <span className="flex items-center gap-1">
            <SearchKeycap>↑↓</SearchKeycap>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <SearchKeycap>↵</SearchKeycap>
            Open
          </span>
          <span className="flex items-center gap-1">
            <SearchKeycap>esc</SearchKeycap>
            Close
          </span>
        </div>
      )}
    </SearchDialog>
  );
}
