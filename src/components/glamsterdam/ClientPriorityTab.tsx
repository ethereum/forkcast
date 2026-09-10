import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from '../navigation';
import { usePrioritizationData } from '../../hooks/usePrioritizationData';
import {
  sortEipAggregates,
  getScoreColor,
  getRatingLabel,
  getScoreScale,
  getMaxScore,
  getMinScore,
  NO_COUNTED_TEAMS,
  SortField,
  SortDirection,
} from '../../utils/prioritization';
import { getInclusionStageColor } from '../../utils/colors';
import { getProposalPrefix, getStageAbbreviation } from '../../utils';
import { eipsData } from '../../data/eips';
import { buildSlides, groupByCategory, CategoryGroup } from '../../domain/eips/eipCategories';
import { UNCATEGORIZED } from '../../data/eip-categories';
import { EipDrawer } from '../eip/EipDrawer';
import { InclusionStage } from '../../types';
import { EipAggregateStance, ClientStance, TeamEntry } from '../../types/prioritization';

type FilterLayer = 'all' | 'EL' | 'CL';
type FilterStance = 'all' | 'support' | 'mixed' | 'oppose' | 'rejected' | 'none';

/** Fork-specific caveat about when the linked perspectives were written. */
const VINTAGE_NOTE: Record<string, string> = {
  glamsterdam: 'Most perspectives were written in November 2025. Thinking and EIPs may have evolved since then.',
};

/**
 * The team columns don't fit the page's prose column once a fork has an Other Teams column,
 * so the table and its toolbar break out of it — centered on the same axis, so the page
 * header and the surrounding prose keep one left edge on every tab.
 */
const BREAKOUT = 'lg:relative lg:left-1/2 lg:-translate-x-1/2 lg:w-[72rem] lg:max-w-[calc(100vw-3rem)]';

const SORT_FIELDS: SortField[] = ['eip', 'average', 'elAverage', 'clAverage', 'stanceCount', 'stage'];
const FILTER_LAYERS: FilterLayer[] = ['EL', 'CL'];
const FILTER_STANCES: FilterStance[] = ['support', 'mixed', 'oppose', 'rejected', 'none'];

/** Query values are user input, so anything off the known list falls back to the default. */
const readEnum = <T extends string>(value: string | null, allowed: readonly T[]): T | null =>
  allowed.includes(value as T) ? (value as T) : null;

interface ClientPriorityTabProps {
  fork: string;
}

const ClientPriorityTab: React.FC<ClientPriorityTabProps> = ({ fork }) => {
  // Sort, filters and the average opt-in live in the query string so a view can be shared.
  const [searchParams, setSearchParams] = useSearchParams();
  const sortField = readEnum(searchParams.get('sort'), SORT_FIELDS) ?? 'average';
  const sortDirection: SortDirection = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
  const filterLayer = readEnum(searchParams.get('layer'), FILTER_LAYERS) ?? 'all';
  const filterStance = readEnum(searchParams.get('stance'), FILTER_STANCES) ?? 'all';
  const hideExcluded = searchParams.get('excluded') !== 'show';
  const groupedByCategory = searchParams.get('group') === 'category';
  // Comma-joined names; an EIP matches if any of the picked teams rated it.
  const filterClients = useMemo(
    () => new Set((searchParams.get('team') ?? '').split(',').filter(Boolean)),
    [searchParams]
  );
  // Memoized on the params, so the aggregates aren't recomputed on every render.
  const countedOtherTeams = useMemo<ReadonlySet<string>>(() => {
    const names = (searchParams.get('avg') ?? '').split(',').filter(Boolean);
    return names.length > 0 ? new Set(names) : NO_COUNTED_TEAMS;
  }, [searchParams]);
  /**
   * Drops every unpicked team's column so one team's board can be read on its own.
   * Inert without a selection, so the param alone never empties the table.
   */
  const focusOnly = searchParams.get('only') === '1' && filterClients.size > 0;
  // Focusing narrows the scores to match the columns, so Avg means what the reader sees.
  const focusTeams = focusOnly ? filterClients : NO_COUNTED_TEAMS;

  const [expandedEip, setExpandedEip] = useState<number | null>(null);
  const [drawerEipId, setDrawerEipId] = useState<number | null>(null);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [avgModalOpen, setAvgModalOpen] = useState(false);
  /** Index of the category on screen, or null when not presenting. */
  const [slide, setSlide] = useState<number | null>(null);

  /** A default value drops its param, so a pristine view has a clean URL. */
  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const { aggregates, elTeams, clTeams, otherTeams } = usePrioritizationData(
    fork,
    countedOtherTeams,
    focusTeams
  );

  // The fork's scale drives the legend, the badge colors and the "high support" cutoff.
  const scoreLegend = getScoreScale(fork);
  const maxScore = getMaxScore(fork);
  const supportFloor = maxScore - 1;

  // Lock body scroll while a modal or the presentation is open
  useEffect(() => {
    if (filtersModalOpen || avgModalOpen || slide !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [filtersModalOpen, avgModalOpen, slide]);

  /**
   * Whether SFI'd EIPs still count as settled. Only true while the fork is choosing its
   * payload — a fork whose EIPs are all Scheduled or Declined (Glamsterdam) would
   * otherwise render an empty table instead of its record.
   */
  const forkIsUndecided = useMemo(
    () =>
      aggregates.some(
        (agg) =>
          agg.inclusionStage === 'Proposed for Inclusion' ||
          agg.inclusionStage === 'Considered for Inclusion'
      ),
    [aggregates]
  );

  // Apply filtering
  const filteredAggregates = useMemo(() => {
    let result = aggregates;

    if (hideExcluded) {
      result = result.filter((agg) => {
        const stage = agg.inclusionStage;
        if (stage === 'Declined for Inclusion' || stage === 'Withdrawn' || stage === 'Unknown') {
          return false;
        }
        // An SFI'd EIP is locked into the fork, so there is no inclusion decision left for
        // this table to support — the same reason the rank page won't put it on the board.
        return !(forkIsUndecided && stage === 'Scheduled for Inclusion');
      });
    }

    if (filterClients.size > 0) {
      result = result.filter((agg) =>
        agg.stances.some((s) => filterClients.has(s.clientName))
      );
    }

    if (filterLayer !== 'all') {
      result = result.filter((agg) => agg.layer === filterLayer);
    }

    if (filterStance === 'support') {
      result = result.filter((agg) => agg.averageScore !== null && agg.averageScore >= supportFloor);
    } else if (filterStance === 'oppose') {
      result = result.filter((agg) => agg.opposeCount > agg.supportCount);
    } else if (filterStance === 'mixed') {
      result = result.filter(
        (agg) => agg.supportCount > 0 && agg.opposeCount > 0
      );
    } else if (filterStance === 'rejected') {
      result = result.filter((agg) => agg.rejectCount > 0);
    } else if (filterStance === 'none') {
      result = result.filter((agg) => agg.stanceCount === 0);
    }

    return result;
  }, [aggregates, filterLayer, filterStance, filterClients, hideExcluded, forkIsUndecided, supportFloor]);

  const isShown = (team: TeamEntry) => !focusOnly || filterClients.has(team.name);
  const shownElTeams = elTeams.filter(isShown);
  const shownClTeams = clTeams.filter(isShown);
  const shownOtherTeams = otherTeams.filter(isShown);

  // Roster-level, so the toolbar and the filter modal keep every team reachable while focused.
  const showOtherTeams = otherTeams.length > 0;
  const showOtherColumn = shownOtherTeams.length > 0;
  // EIP, Title, Stage and Avg, plus a column for each team group that has a team.
  const columnCount =
    4 + [shownElTeams, shownClTeams, shownOtherTeams].filter((teams) => teams.length > 0).length;
  // Focusing narrows the table, so it no longer needs to escape the prose column.
  const wideTable = showOtherTeams && !focusOnly;

  // Apply sorting
  const sortedAggregates = useMemo(() => {
    return sortEipAggregates(filteredAggregates, sortField, sortDirection);
  }, [filteredAggregates, sortField, sortDirection]);

  /**
   * The categories are curated per fork, so grouping is only worth offering once
   * most of a fork's board sits in one — otherwise the view is an "Uncategorized"
   * heap plus whichever few proposals a later fork happens to share.
   */
  const canGroupByCategory = useMemo(() => {
    const groups = groupByCategory(aggregates, (agg) => agg.eipId);
    const uncategorized = groups.find(({ name }) => name === UNCATEGORIZED)?.items.length ?? 0;
    return uncategorized * 2 < aggregates.length;
  }, [aggregates]);

  /**
   * Categories render in their declared order, but `groupByCategory` also orders
   * within a group, so the column sort has to be re-applied to each bucket.
   */
  const groupAndSort = useCallback(
    (items: EipAggregateStance[]) =>
      groupByCategory(items, (agg) => agg.eipId).map(({ id, name, items: bucket, subgroups }) => ({
        id,
        name,
        items: sortEipAggregates(bucket, sortField, sortDirection),
        subgroups: subgroups.map((subgroup) => ({
          name: subgroup.name,
          items: sortEipAggregates(subgroup.items, sortField, sortDirection),
        })),
      })),
    [sortField, sortDirection]
  );

  const categoryGroups = useMemo(
    () => (groupedByCategory && canGroupByCategory ? groupAndSort(filteredAggregates) : null),
    [groupedByCategory, canGroupByCategory, filteredAggregates, groupAndSort]
  );

  /**
   * The deck walks the same cuts as the grouped table, but in its own running order
   * and as an EL board — CL proposals go with the CL columns, so a category with
   * nothing on the execution layer drops out of the deck by itself.
   */
  const slides = useMemo(() => {
    if (!canGroupByCategory) return null;
    const elOnly = filteredAggregates.filter((agg) => agg.layer === 'EL');
    return elOnly.length > 0 ? buildSlides(groupAndSort(elOnly)) : null;
  }, [canGroupByCategory, filteredAggregates, groupAndSort]);
  const slideCount = slides?.length ?? 0;

  const stopPresenting = useCallback(() => {
    setSlide(null);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  const startPresenting = () => {
    setSlide(0);
    // A slide is only worth the screen it fills, but the browser may refuse.
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    if (slide === null) return;

    // In fullscreen the browser handles Escape itself and swallows the keydown, so
    // leaving fullscreen has to leave the presentation or the slide would sit over
    // the page with no way back.
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setSlide(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopPresenting();
        return;
      }
      const last = slideCount - 1;
      let next: number | null = null;
      if (['ArrowRight', ' ', 'PageDown', 'ArrowDown'].includes(event.key)) {
        next = Math.min(slide + 1, last);
      } else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(event.key)) {
        next = Math.max(slide - 1, 0);
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = last;
      }
      if (next === null) return;
      event.preventDefault();
      setSlide(next);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [slide, slideCount, stopPresenting]);

  // Gates the ⚑ flag and the "Has Rejections" filter, so both stay reachable no
  // matter how the current view is narrowed.
  const hasRejections = useMemo(
    () => aggregates.some((a) => a.rejectCount > 0),
    [aggregates]
  );

  // Sits beside the EIP count in the toolbar, so it has to share that count's basis.
  const rejectedInView = useMemo(
    () => filteredAggregates.filter((a) => a.rejectCount > 0).length,
    [filteredAggregates]
  );

  const lowestScore = getMinScore(fork);

  const handleSort = (field: SortField) => {
    const direction = sortField === field && sortDirection === 'desc' ? 'asc' : 'desc';
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (field === 'average') next.delete('sort');
        else next.set('sort', field);
        if (direction === 'desc') next.delete('dir');
        else next.set('dir', direction);
        return next;
      },
      { replace: true }
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  /**
   * While focused, Avg covers exactly the selected teams, so "counts towards Avg" and
   * "is selected" are the same question and the panel has to ask the latter.
   */
  const avgSelection = focusOnly ? filterClients : countedOtherTeams;

  // Roster order, so the wording matches the panel and the Other Teams column.
  const countedTeamNames = otherTeams
    .filter((team) => avgSelection.has(team.name))
    .map((team) => team.name);
  const focusedTeamNames = [...elTeams, ...clTeams, ...otherTeams]
    .filter((team) => filterClients.has(team.name))
    .map((team) => team.name);

  const toggleCountedTeam = (name: string) => {
    const next = new Set(countedOtherTeams);
    if (!next.delete(name)) next.add(name);
    // Roster order, so the same selection always produces the same URL.
    const ordered = otherTeams.filter((team) => next.has(team.name)).map((team) => team.name);
    setParam('avg', ordered.length > 0 ? ordered.join(',') : null);
  };

  const stanceFilterOptions: { value: FilterStance; label: string }[] = [
    { value: 'all', label: 'All Stances' },
    { value: 'support', label: 'High Support' },
    { value: 'mixed', label: 'Contested' },
    { value: 'oppose', label: 'More Opposition' },
    ...(hasRejections ? [{ value: 'rejected' as const, label: 'Has Rejections' }] : []),
    { value: 'none', label: 'No Stances' },
  ];

  const activeFilterCount = [
    filterLayer !== 'all',
    filterClients.size > 0,
    filterStance !== 'all',
  ].filter(Boolean).length;

  const toggleClient = (name: string) => {
    const next = new Set(filterClients);
    if (!next.delete(name)) next.add(name);
    // Roster order, so the same selection always produces the same URL.
    const ordered = [...elTeams, ...clTeams, ...otherTeams]
      .filter((team) => next.has(team.name))
      .map((team) => team.name);
    setParam('team', ordered.length > 0 ? ordered.join(',') : null);
  };

  const toggleAvgTeam = focusOnly ? toggleClient : toggleCountedTeam;
  const clearAvgTeams = () => {
    if (!focusOnly) {
      setParam('avg', null);
      return;
    }
    // Dropping the non-client teams from the selection is what removes them from Avg here.
    const ordered = [...elTeams, ...clTeams]
      .filter((team) => filterClients.has(team.name))
      .map((team) => team.name);
    setParam('team', ordered.length > 0 ? ordered.join(',') : null);
  };

  // The EIP links stay real anchors, so keep every navigating gesture — modifier
  // clicks, middle click, "open in new tab" — and only take over the plain click.
  const openDrawer = (eipId: number) => (event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setDrawerEipId(eipId);
  };

  const clearFilters = () =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        ['layer', 'team', 'stance', 'only'].forEach((key) => next.delete(key));
        return next;
      },
      { replace: true }
    );

  const renderCard = (agg: EipAggregateStance) => {
    const eip = eipsData.find((e) => e.id === agg.eipId);
    const isExpanded = expandedEip === agg.eipId;
    const shortStage = getStageAbbreviation(agg.inclusionStage);

    return (
      <div
        key={agg.eipId}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
      >
        <button
          onClick={() => setExpandedEip(isExpanded ? null : agg.eipId)}
          className="w-full px-4 py-3 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-sm text-purple-600 dark:text-purple-400">
                  {eip ? getProposalPrefix(eip) : 'EIP'}-{agg.eipId}
                </span>
                {agg.layer && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                    agg.layer === 'EL'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                  }`}>
                    {agg.layer}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 text-[10px] rounded ${getInclusionStageColor(agg.inclusionStage as InclusionStage)}`} title={agg.inclusionStage}>
                  {shortStage}
                </span>
              </div>
              <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
                {agg.eipTitle}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {agg.rejectCount > 0 && <RejectionFlag count={agg.rejectCount} />}
              {agg.averageScore !== null ? (
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${getScoreColor(Math.round(agg.averageScore), true, maxScore)}`}>
                  {agg.averageScore.toFixed(1)}
                </span>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-400 italic">
                  No data
                </span>
              )}
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700">
            <ClientStancesGrid
              stances={agg.stances}
              elTeams={shownElTeams}
              clTeams={shownClTeams}
              otherTeams={shownOtherTeams}
              maxScore={maxScore}
            />
          </div>
        )}
      </div>
    );
  };

  const renderRow = (agg: EipAggregateStance) => (
    <TableRow
      key={agg.eipId}
      agg={agg}
      elTeams={shownElTeams}
      clTeams={shownClTeams}
      otherTeams={showOtherColumn ? shownOtherTeams : null}
      otherTeamsAsBadges={focusOnly}
      maxScore={maxScore}
      columnCount={columnCount}
      isExpanded={expandedEip === agg.eipId}
      onToggle={() => setExpandedEip(expandedEip === agg.eipId ? null : agg.eipId)}
      onOpenDrawer={openDrawer(agg.eipId)}
    />
  );

  return (
    <>
      <p className={`text-sm text-slate-500 dark:text-slate-400 ${VINTAGE_NOTE[fork] ? 'mb-1' : 'mb-6'}`}>
        Aggregate client team stances on proposed EIPs. Scores normalized to a{' '}
        {lowestScore}-{maxScore} scale.
        {focusOnly
          ? ` Avg covers only ${focusedTeamNames.join(', ')}.`
          : countedTeamNames.length > 0 && ` Avg also counts ${countedTeamNames.join(', ')}.`}
      </p>
      {VINTAGE_NOTE[fork] && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{VINTAGE_NOTE[fork]}</p>
      )}

      {/* Toolbar */}
      <div className={`mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 ${wideTable ? BREAKOUT : ''}`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {/* Filters button */}
          <button
            onClick={() => setFiltersModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              activeFilterCount > 0
                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Fold non-client teams into the scores */}
          {showOtherTeams && (
            <button
              onClick={() => setAvgModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                countedTeamNames.length > 0
                  ? 'bg-fuchsia-50 dark:bg-fuchsia-900/20 border-fuchsia-300 dark:border-fuchsia-700 text-fuchsia-700 dark:text-fuchsia-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
              Add to avg
              {countedTeamNames.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-fuchsia-200 dark:bg-fuchsia-800 text-fuchsia-800 dark:text-fuchsia-200 rounded-full">
                  {countedTeamNames.length}
                </span>
              )}
            </button>
          )}

          {/* Active only toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideExcluded}
              onChange={(e) => setParam('excluded', e.target.checked ? null : 'show')}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-slate-600 dark:text-slate-300">Active only</span>
          </label>

          {/* Group by category toggle */}
          {canGroupByCategory && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={groupedByCategory}
                onChange={(e) => setParam('group', e.target.checked ? 'category' : null)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">Group by category</span>
            </label>
          )}

          {/* Stats summary */}
          <div className="flex items-center gap-4 ml-auto text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              {sortedAggregates.length} EIPs
            </span>
            {rejectedInView > 0 && (
              <span className="hidden md:flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-slate-600 dark:text-slate-300">{rejectedInView} with rejections</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters Modal */}
      {filtersModalOpen && (
        <ModalShell
          title="Filters"
          onClose={() => setFiltersModalOpen(false)}
          headerAction={
            activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-purple-600 dark:text-purple-400 font-medium"
              >
                Clear all
              </button>
            )
          }
          footer={
            <button
              onClick={() => setFiltersModalOpen(false)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              Show {sortedAggregates.length} {sortedAggregates.length === 1 ? 'result' : 'results'}
            </button>
          }
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Layer</h3>
              <div className="flex flex-wrap gap-2">
                {(['all', 'EL', 'CL'] as const).map((layer) => {
                  const isSelected = filterLayer === layer;
                  const label = layer === 'all' ? 'All Layers' : layer === 'EL' ? 'Execution Layer' : 'Consensus Layer';
                  return (
                    <button
                      key={layer}
                      onClick={() => setParam('layer', layer === 'all' ? null : layer)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Stance</h3>
              <div className="flex flex-wrap gap-2">
                {stanceFilterOptions.map(({ value, label }) => {
                  const isSelected = filterStance === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setParam('stance', value === 'all' ? null : value)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-slate-800'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <TeamFilterGroup
              heading="EL Clients"
              teams={elTeams}
              accent="EL"
              selected={filterClients}
              onToggle={toggleClient}
            />

            <TeamFilterGroup
              heading="CL Clients"
              teams={clTeams}
              accent="CL"
              selected={filterClients}
              onToggle={toggleClient}
            />

            {showOtherTeams && (
              <TeamFilterGroup
                heading="Other Teams"
                teams={otherTeams}
                accent="OTHER"
                selected={filterClients}
                onToggle={toggleClient}
              />
            )}

            <div className="md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <label
                className={`flex items-start gap-3 ${
                  filterClients.size > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={focusOnly}
                  disabled={filterClients.size === 0}
                  onChange={(e) => setParam('only', e.target.checked ? '1' : null)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                />
                <span>
                  <span className="block text-sm text-slate-700 dark:text-slate-300">
                    Show only the selected teams
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Hides every other team&rsquo;s column, and narrows Avg and the rejection
                    count to the teams still shown.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Add to average modal */}
      {avgModalOpen && (
        <ModalShell
          title="Add to average score"
          onClose={() => setAvgModalOpen(false)}
          headerAction={
            countedTeamNames.length > 0 && (
              <button
                onClick={clearAvgTeams}
                className="text-sm text-purple-600 dark:text-purple-400 font-medium"
              >
                Clear
              </button>
            )
          }
          footer={
            <button
              onClick={() => setAvgModalOpen(false)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              Done
            </button>
          }
        >
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {focusOnly
              ? 'Avg currently covers only the teams you selected, so ticking one here selects it — bringing back its column as well as its ratings.'
              : 'Non-client teams are left out of the scores by default. Ticking one folds its ratings into Avg, the stance counts and the rejection flag.'}
          </p>
          <div className="space-y-1">
            {otherTeams.map((team) => (
              <label
                key={team.name}
                className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <input
                  type="checkbox"
                  checked={avgSelection.has(team.name)}
                  onChange={() => toggleAvgTeam(team.name)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{team.name}</span>
              </label>
            ))}
          </div>
        </ModalShell>
      )}

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-2">
        {sortedAggregates.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center text-slate-500 dark:text-slate-400">
            No EIPs found with prioritization data
          </div>
        ) : categoryGroups ? (
          categoryGroups.map(({ name, items, subgroups }) => (
            <div key={name} className="space-y-2">
              {/* One step brighter than the subheads below, so dark mode keeps the hierarchy. */}
              <h4 className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                {name}
              </h4>
              {subgroups.length > 0
                ? subgroups.map((subgroup) => (
                    <div key={subgroup.name} className="space-y-2">
                      <h5 className="pt-1 text-[11px] font-medium text-slate-400">
                        {subgroup.name}
                      </h5>
                      {subgroup.items.map(renderCard)}
                    </div>
                  ))
                : items.map(renderCard)}
            </div>
          ))
        ) : (
          sortedAggregates.map(renderCard)
        )}
      </div>

      {/* Desktop Table */}
      {/* Scrolls rather than clips: the columns grow as more teams publish rankings. */}
      <div
        className={`hidden lg:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-x-auto ${
          wideTable ? BREAKOUT : ''
        }`}
      >
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th
                className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                onClick={() => handleSort('eip')}
              >
                <div className="flex items-center gap-2">
                  EIP
                  <SortIcon field="eip" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                Title
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                onClick={() => handleSort('stage')}
              >
                <div className="flex items-center gap-2">
                  Stage
                  <SortIcon field="stage" />
                </div>
              </th>
              {shownElTeams.length > 0 && (
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    EL Clients
                  </div>
                </th>
              )}
              {shownClTeams.length > 0 && (
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    CL Clients
                  </div>
                </th>
              )}
              {/* Avg sits with the clients it averages; Other Teams trail it as context. */}
              <th
                className="px-4 py-3 text-right text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50"
                onClick={() => handleSort('average')}
                title={
                  focusOnly
                    ? `Covers only ${focusedTeamNames.join(', ')}`
                    : countedTeamNames.length > 0
                      ? `Client teams plus ${countedTeamNames.join(', ')}`
                      : undefined
                }
              >
                <div className="flex items-center justify-end gap-2">
                  {countedTeamNames.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
                  )}
                  Avg
                  <SortIcon field="average" />
                </div>
              </th>
              {showOtherColumn && (
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
                    Other Teams
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sortedAggregates.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No EIPs found with prioritization data
                </td>
              </tr>
            ) : categoryGroups ? (
              categoryGroups.map(({ name, items, subgroups }) => (
                <React.Fragment key={name}>
                  <tr className="bg-slate-50 dark:bg-slate-700/30">
                    <td
                      colSpan={columnCount}
                      className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300"
                    >
                      {name}
                    </td>
                  </tr>
                  {subgroups.length > 0
                    ? subgroups.map((subgroup) => (
                        <React.Fragment key={subgroup.name}>
                          <tr>
                            <td
                              colSpan={columnCount}
                              className="px-4 pt-3 pb-1 text-[11px] font-medium text-slate-400"
                            >
                              {subgroup.name}
                            </td>
                          </tr>
                          {subgroup.items.map(renderRow)}
                        </React.Fragment>
                      ))
                    : items.map(renderRow)}
                </React.Fragment>
              ))
            ) : (
              sortedAggregates.map(renderRow)
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className={`mt-6 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg ${wideTable ? BREAKOUT : ''}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Score Legend</h3>
          {/* Desktop only: a slide is sized to a projector, not a phone. */}
          {slideCount > 0 && (
            <button
              onClick={startPresenting}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40"
              title="One full-screen slide per category, execution layer only"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM12 15v5m0 0h-3m3 0h3" />
              </svg>
              Present EL
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {scoreLegend.map(({ score, label }) => (
            <span key={score} className={`px-2 py-1 rounded ${getScoreColor(score, true, maxScore)}`}>
              {score} = {label}
            </span>
          ))}
          <span className={`px-2 py-1 rounded ${getScoreColor(null, true)}`}>? = Uncertain</span>
          <span className={`px-2 py-1 rounded ${getScoreColor(null, false)}`}>- = Not Mentioned</span>
        </div>

      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-400">
        <p>
          Stances parsed from client team blog posts and public statements.
          Data may not reflect current positions.
        </p>
      </div>

      {slide !== null && slides && (
        <PresentationView
          groups={slides}
          index={slide}
          elTeams={shownElTeams}
          maxScore={maxScore}
          onNavigate={setSlide}
          onExit={stopPresenting}
        />
      )}

      <EipDrawer eipId={drawerEipId} onClose={() => setDrawerEipId(null)} />
    </>
  );
};

interface TableRowProps {
  agg: EipAggregateStance;
  elTeams: TeamEntry[];
  clTeams: TeamEntry[];
  /** null when the fork has no non-client teams, so the column is omitted entirely. */
  otherTeams: TeamEntry[] | null;
  /** A count is useless once the column is narrowed to the teams you asked for. */
  otherTeamsAsBadges: boolean;
  maxScore: number;
  columnCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenDrawer: (event: React.MouseEvent) => void;
}

const TableRow: React.FC<TableRowProps> = ({
  agg,
  elTeams,
  clTeams,
  otherTeams,
  otherTeamsAsBadges,
  maxScore,
  columnCount,
  isExpanded,
  onToggle,
  onOpenDrawer,
}) => {
  const eip = eipsData.find((e) => e.id === agg.eipId);
  const shortStage = getStageAbbreviation(agg.inclusionStage);

  // Rides in whichever cell is last, so it stays at the row's edge on both fork layouts.
  const expandButton = (
    <button
      onClick={onToggle}
      className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
      aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
    >
      <svg
        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {eip ? (
              <Link
                to={`/eips/${eip.id}`}
                onClick={onOpenDrawer}
                className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
              >
                {getProposalPrefix(eip)}-{agg.eipId}
              </Link>
            ) : (
              <a
                href={`https://eips.ethereum.org/EIPS/eip-${agg.eipId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
              >
                EIP-{agg.eipId}
              </a>
            )}
            {agg.layer && (
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                agg.layer === 'EL'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
              }`}>
                {agg.layer}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <Link
            to={`/eips/${agg.eipId}`}
            // The drawer reads from `eipsData`, so an EIP we don't carry has to navigate.
            onClick={eip ? onOpenDrawer : undefined}
            className="text-sm text-slate-900 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400 line-clamp-1"
          >
            {agg.eipTitle}
          </Link>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block px-2 py-0.5 text-xs rounded ${getInclusionStageColor(agg.inclusionStage as InclusionStage)}`} title={agg.inclusionStage}>
            {shortStage}
          </span>
        </td>
        {elTeams.length > 0 && (
          <td className="px-4 py-3">
            <ClientStanceBadges stances={agg.stances} teams={elTeams} maxScore={maxScore} />
          </td>
        )}
        {clTeams.length > 0 && (
          <td className="px-4 py-3">
            <ClientStanceBadges stances={agg.stances} teams={clTeams} maxScore={maxScore} />
          </td>
        )}
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {agg.rejectCount > 0 && <RejectionFlag count={agg.rejectCount} />}
            {agg.averageScore !== null ? (
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${getScoreColor(Math.round(agg.averageScore), true, maxScore)}`}>
                {agg.averageScore.toFixed(1)}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-400">&mdash;</span>
            )}
            {!otherTeams && expandButton}
          </div>
        </td>
        {otherTeams && (
          <td className="px-4 py-3">
            <div className="flex items-center justify-center gap-3">
              {otherTeamsAsBadges ? (
                <ClientStanceBadges stances={agg.stances} teams={otherTeams} maxScore={maxScore} />
              ) : (
                <OtherTeamsCount stances={agg.stances} teams={otherTeams} />
              )}
              {expandButton}
            </div>
          </td>
        )}
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50 dark:bg-slate-800/50">
          <td colSpan={columnCount} className="px-4 py-4">
            <ClientStancesGrid
              stances={agg.stances}
              elTeams={elTeams}
              clTeams={clTeams}
              otherTeams={otherTeams ?? []}
              maxScore={maxScore}
            />
          </td>
        </tr>
      )}
    </>
  );
};

const RejectionFlag: React.FC<{ count: number }> = ({ count }) => (
  <span
    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200"
    title={`${count} team${count === 1 ? '' : 's'} suggested rejecting this EIP`}
  >
    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M3 2a1 1 0 011-1h1v18H3V2zm3 0h9.5a.5.5 0 01.4.8L13.2 6.5l2.7 3.7a.5.5 0 01-.4.8H6V2z" />
    </svg>
    {count}
  </span>
);

/**
 * Non-client teams get a count rather than per-team badges: their ratings carry no score,
 * the roster keeps growing, and the expanded row already lists each team's tier.
 */
const OtherTeamsCount: React.FC<{ stances: ClientStance[]; teams: TeamEntry[] }> = ({ stances, teams }) => {
  const ranked = teams
    .map((team) => ({ team, stance: stances.find((s) => s.clientName === team.name) }))
    .filter((entry) => entry.stance);

  if (ranked.length === 0) {
    return <span className="text-slate-400 dark:text-slate-400">&mdash;</span>;
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300"
      title={ranked
        .map(({ team, stance }) => `${team.name}: ${getRatingLabel(stance!.ratingSystem, stance!.rawRating)}`)
        .join('\n')}
    >
      {ranked.length}
    </span>
  );
};

type SlideRow =
  | { kind: 'subhead'; key: string; name: string }
  | { kind: 'eip'; key: string; agg: EipAggregateStance };

/** Slides carry no links, so the prefix is all that distinguishes an RIP from an EIP. */
const slideProposalLabel = (eipId: number) => {
  const eip = eipsData.find((e) => e.id === eipId);
  return `${eip ? getProposalPrefix(eip) : 'EIP'}-${eipId}`;
};

interface PresentationViewProps {
  groups: CategoryGroup<EipAggregateStance>[];
  index: number;
  elTeams: TeamEntry[];
  maxScore: number;
  onNavigate: (index: number) => void;
  onExit: () => void;
}

/**
 * One category per screen, for walking a fork's EL proposals on a call. Everything is
 * sized in viewport units so a slide fills whatever it is projected onto, and the
 * row height shrinks to fit the longest category rather than clipping it — which is
 * why the type sizes are computed here instead of being classes.
 */
const PresentationView: React.FC<PresentationViewProps> = ({
  groups,
  index,
  elTeams,
  maxScore,
  onNavigate,
  onExit,
}) => {
  const group = groups[index];

  const eipRow = (agg: EipAggregateStance): SlideRow => ({
    kind: 'eip',
    key: String(agg.eipId),
    agg,
  });
  const rows: SlideRow[] =
    group.subgroups.length > 0
      ? group.subgroups.flatMap((subgroup) => [
          { kind: 'subhead' as const, key: `sub-${subgroup.name}`, name: subgroup.name },
          ...subgroup.items.map(eipRow),
        ])
      : group.items.map(eipRow);

  // The vertical budget the table gets, once the heading and footer have theirs.
  const rowH = Math.min(6.7, 76 / (rows.length + 1));
  const vh = (fraction: number) => `${(rowH * fraction).toFixed(2)}vh`;
  const badgeStyle: React.CSSProperties = {
    width: vh(0.67),
    height: vh(0.67),
    fontSize: vh(0.27),
    borderRadius: vh(0.09),
    flex: 'none',
  };
  /** Wide enough for the group's badges, so columns don't shift between slides. */
  const badgesWidth = (count: number) => `${(count * rowH * 0.67 + count * 0.55 + 2).toFixed(2)}vh`;

  const cell = { height: vh(1), fontSize: vh(0.37), padding: `0 ${vh(0.22)}` };
  const header = { height: vh(0.67), fontSize: vh(0.27), padding: `0 ${vh(0.22)}` };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
      <div className="flex-1 flex flex-col justify-center min-h-0 px-[4vw]">
        <h2
          className="font-semibold text-slate-900 dark:text-slate-100"
          style={{ fontSize: '4.2vh', marginBottom: '2vh' }}
        >
          {group.name}
          <span className="ml-3 font-normal text-slate-400" style={{ fontSize: '1.8vh' }}>
            {group.items.length} {group.items.length === 1 ? 'EIP' : 'EIPs'}
          </span>
        </h2>

        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col style={{ width: '13vh' }} />
            <col />
            {elTeams.length > 0 && <col style={{ width: badgesWidth(elTeams.length) }} />}
            <col style={{ width: '10vh' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left font-medium text-slate-500 dark:text-slate-400" style={header}>
                EIP
              </th>
              <th className="text-left font-medium text-slate-500 dark:text-slate-400" style={header}>
                Title
              </th>
              {elTeams.length > 0 && (
                <th className="text-center font-medium text-indigo-600 dark:text-indigo-400" style={header}>
                  EL Clients
                </th>
              )}
              <th className="text-right font-medium text-slate-500 dark:text-slate-400" style={header}>
                Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.kind === 'subhead' ? (
                <tr key={row.key}>
                  <td
                    colSpan={elTeams.length > 0 ? 4 : 3}
                    className="align-bottom font-medium uppercase tracking-wide text-slate-400"
                    style={{ ...cell, height: vh(0.63), fontSize: vh(0.22) }}
                  >
                    {row.name}
                  </td>
                </tr>
              ) : (
                <tr key={row.key} className="border-b border-slate-100 dark:border-slate-800">
                  <td
                    className="font-mono text-purple-600 dark:text-purple-400 whitespace-nowrap"
                    style={cell}
                  >
                    {slideProposalLabel(row.agg.eipId)}
                  </td>
                  <td className="text-slate-900 dark:text-slate-100 truncate" style={cell}>
                    {row.agg.eipTitle}
                  </td>
                  {elTeams.length > 0 && (
                    <td style={cell}>
                      <ClientStanceBadges
                        stances={row.agg.stances}
                        teams={elTeams}
                        maxScore={maxScore}
                        boxStyle={badgeStyle}
                      />
                    </td>
                  )}
                  <td className="text-right" style={cell}>
                    {row.agg.averageScore !== null ? (
                      <span
                        className={`inline-flex items-center font-medium rounded ${getScoreColor(Math.round(row.agg.averageScore), true, maxScore)}`}
                        style={{ fontSize: vh(0.3), padding: `${vh(0.07)} ${vh(0.17)}`, borderRadius: vh(0.09) }}
                      >
                        {row.agg.averageScore.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-500" style={{ fontSize: vh(0.3) }}>
                        —
                      </span>
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <div
        className="shrink-0 flex items-center justify-between px-[4vw] pb-[2vh] text-slate-400"
        style={{ fontSize: '1.6vh' }}
      >
        <span>&larr; &rarr; to navigate &middot; Esc to exit</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate(Math.max(index - 1, 0))}
            disabled={index === 0}
            className="disabled:opacity-30 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Previous category"
          >
            &larr;
          </button>
          <span className="tabular-nums">
            {index + 1} / {groups.length}
          </span>
          <button
            onClick={() => onNavigate(Math.min(index + 1, groups.length - 1))}
            disabled={index === groups.length - 1}
            className="disabled:opacity-30 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Next category"
          >
            &rarr;
          </button>
          <button onClick={onExit} className="hover:text-slate-600 dark:hover:text-slate-300">
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};

interface ClientStanceBadgesProps {
  stances: ClientStance[];
  teams: TeamEntry[];
  maxScore: number;
  /** Overrides the badge box, for the viewport-scaled presentation slides. */
  boxStyle?: React.CSSProperties;
}

const ClientStanceBadges: React.FC<ClientStanceBadgesProps> = ({ stances, teams, maxScore, boxStyle }) => {
  return (
    <div className="flex justify-center gap-1">
      {teams.map((team) => {
        const stance = stances.find((s) => s.clientName === team.name);
        const hasStance = !!stance;
        const score = stance?.normalizedScore ?? null;

        return (
          <div
            key={team.name}
            className={`flex items-center justify-center font-medium rounded ${
              boxStyle ? '' : 'w-6 h-6 text-[10px]'
            } ${getScoreColor(score, hasStance, maxScore)}`}
            style={boxStyle}
            title={stance ? `${team.name}: ${getRatingLabel(stance.ratingSystem, stance.rawRating)}` : `${team.name}: Not mentioned`}
          >
            {team.initials}
          </div>
        );
      })}
    </div>
  );
};

interface ClientStancesGridProps {
  stances: ClientStance[];
  elTeams: TeamEntry[];
  clTeams: TeamEntry[];
  otherTeams: TeamEntry[];
  maxScore: number;
}

const ClientStancesGrid: React.FC<ClientStancesGridProps> = ({ stances, elTeams, clTeams, otherTeams, maxScore }) => {
  const renderClientRow = (team: TeamEntry) => {
    const stance = stances.find((s) => s.clientName === team.name);

    return (
      <div key={team.name} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
        <span className="text-sm text-slate-700 dark:text-slate-300">{team.name}</span>
        <div className="flex items-center gap-2">
          {stance ? (
            <>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${getScoreColor(stance.normalizedScore, true, maxScore)}`}>
                {getRatingLabel(stance.ratingSystem, stance.rawRating)}
              </span>
              {stance.comment && (
                <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={stance.comment}>
                  {stance.comment}
                </span>
              )}
              {stance.sourceUrl && (
                <a
                  href={stance.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-400 italic">No stance</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {elTeams.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Execution Layer Clients
          </h4>
          <div>{elTeams.map(renderClientRow)}</div>
        </div>
      )}
      {clTeams.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-teal-600 dark:text-teal-400 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            Consensus Layer Clients
          </h4>
          <div>{clTeams.map(renderClientRow)}</div>
        </div>
      )}
      {otherTeams.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-fuchsia-600 dark:text-fuchsia-400 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
            Other Teams
          </h4>
          <div>{otherTeams.map(renderClientRow)}</div>
        </div>
      )}
    </div>
  );
};

interface ModalShellProps {
  title: string;
  onClose: () => void;
  /** Sits left of the close button, e.g. a reset action. */
  headerAction?: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}

/** Bottom sheet on mobile, centered dialog from md up. Body scrolls; header and footer don't. */
const ModalShell: React.FC<ModalShellProps> = ({ title, onClose, headerAction, footer, children }) => (
  <div className="fixed inset-0 z-50 animate-fadeIn">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="md:absolute md:inset-0 md:flex md:items-center md:justify-center absolute bottom-0 left-0 right-0">
      <div className="bg-white dark:bg-slate-800 md:rounded-2xl rounded-t-2xl md:max-w-2xl md:w-full max-h-[85vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-fade-scale md:shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <div className="flex items-center gap-3">
            {headerAction}
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>

        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          {footer}
        </div>
      </div>
    </div>
  </div>
);

const FILTER_ACCENTS: Record<TeamEntry['type'], { dot: string; selected: string }> = {
  EL: {
    dot: 'bg-indigo-500',
    selected: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-800',
  },
  CL: {
    dot: 'bg-teal-500',
    selected: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-slate-800',
  },
  OTHER: {
    dot: 'bg-fuchsia-500',
    selected: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-300 ring-2 ring-fuchsia-500 ring-offset-1 dark:ring-offset-slate-800',
  },
};

interface TeamFilterGroupProps {
  heading: string;
  teams: TeamEntry[];
  accent: TeamEntry['type'];
  selected: ReadonlySet<string>;
  onToggle: (client: string) => void;
}

const TeamFilterGroup: React.FC<TeamFilterGroupProps> = ({ heading, teams, accent, selected: selectedTeams, onToggle }) => {
  const { dot, selected } = FILTER_ACCENTS[accent];

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dot}`}></span>
        {heading}
      </h3>
      <div className="flex flex-wrap gap-2">
        {teams.map((team) => {
          const isSelected = selectedTeams.has(team.name);
          return (
            <button
              key={team.name}
              onClick={() => onToggle(team.name)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isSelected
                  ? selected
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {team.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ClientPriorityTab;
