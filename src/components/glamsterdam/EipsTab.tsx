import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { eipsData } from '../../data/eips';
import devnetDataRaw from '../../data/devnets/glamsterdam.json';
import { getComplexityTierColor } from '../../domain/complexity/complexity';
import { useComplexityData } from '../../domain/complexity/useComplexityData';
import {
  buildActiveDevnetIdSet,
  buildEipExplorerItems,
  EIP_EXPLORER_DEFAULT_FILTERS,
  EIP_EXPLORER_DEFAULT_SORT,
  filterEipExplorerItems,
  isActiveExplorerStage,
  sortEipExplorerItems,
  type ClientPriorityTier,
  type DevnetCatalogEntry,
  type EipExplorerFilters,
  type EipExplorerItem,
  type HeadlinerStatus,
  type ExplorerSignalFilter,
  type ExplorerSortKey,
  type ExplorerStageFilter,
} from '../../domain/eip-explorer/eipExplorer';
import { useDevnetNetworks } from '../../hooks/useDevnetNetworks';
import { getCLClients, getELClients, usePrioritizationData } from '../../hooks/usePrioritizationData';
import type { InclusionStage } from '../../types/eip';
import type { ClientStance } from '../../types/prioritization';
import { getInclusionStageColor } from '../../utils/colors';
import { getClientInitials, getRatingLabel, getScoreColor } from '../../utils/prioritization';
import { Tooltip } from '../ui';

const SELECTED_FORK = 'glamsterdam';

const devnetData = devnetDataRaw as {
  devnets: DevnetCatalogEntry[];
};

const stageFilterOptions: Array<{ value: ExplorerStageFilter; label: string; description: string }> = [
  { value: 'active', label: 'Active', description: 'PFI, CFI, SFI, and included EIPs' },
  { value: 'Proposed for Inclusion', label: 'PFI', description: 'Proposed for Inclusion' },
  { value: 'Considered for Inclusion', label: 'CFI', description: 'Considered for Inclusion' },
  { value: 'Scheduled for Inclusion', label: 'SFI', description: 'Scheduled for Inclusion' },
  { value: 'Declined for Inclusion', label: 'DFI', description: 'Declined for Inclusion' },
  { value: 'all', label: 'All', description: 'Every Glamsterdam-related EIP' },
];

const layerFilterOptions = [
  { value: 'all', label: 'All' },
  { value: 'EL', label: 'EL' },
  { value: 'CL', label: 'CL' },
] as const;

const signalOptions: Array<{ value: ExplorerSignalFilter; label: string; description: string }> = [
  { value: 'all', label: 'All', description: 'No highlight filter' },
  { value: 'headliners', label: 'Headliners', description: 'Selected or candidate headliner EIPs' },
  { value: 'active-devnet', label: 'In devnet', description: 'Included in at least one active devnet' },
  { value: 'high-complexity', label: 'High complexity', description: 'High test complexity assessment' },
  { value: 'contested', label: 'Client split', description: 'At least one support and one oppose stance' },
  { value: 'unassessed', label: 'Unassessed', description: 'No test complexity assessment yet' },
];

const EipsTab: React.FC = () => {
  const [filters, setFilters] = useState<EipExplorerFilters>(EIP_EXPLORER_DEFAULT_FILTERS);
  const [sort, setSort] = useState(EIP_EXPLORER_DEFAULT_SORT);
  const [selectedEipId, setSelectedEipId] = useState<number | null>(null);
  const mobilePreviewRef = useRef<HTMLDivElement>(null);

  const { complexityMap, error: complexityError } = useComplexityData();
  const { aggregates: priorityAggregates } = usePrioritizationData(SELECTED_FORK);
  const {
    activeSeries,
    error: devnetError,
  } = useDevnetNetworks();

  const activeDevnetIds = useMemo(() => buildActiveDevnetIdSet(activeSeries), [activeSeries]);

  const items = useMemo(
    () =>
      buildEipExplorerItems({
        eips: eipsData,
        forkName: SELECTED_FORK,
        devnets: devnetData.devnets,
        activeDevnetIds,
        complexityMap,
        priorityAggregates,
      }),
    [activeDevnetIds, complexityMap, priorityAggregates],
  );

  const visibleItems = useMemo(
    () => sortEipExplorerItems(filterEipExplorerItems(items, filters), sort),
    [filters, items, sort],
  );

  const filterCounts = useMemo(() => buildFilterCounts(items), [items]);

  useEffect(() => {
    if (visibleItems.length === 0) {
      setSelectedEipId(null);
      return;
    }

    if (selectedEipId === null || !visibleItems.some((item) => item.eipId === selectedEipId)) {
      setSelectedEipId(visibleItems[0].eipId);
    }
  }, [selectedEipId, visibleItems]);

  const selectedItem = useMemo(
    () => visibleItems.find((item) => item.eipId === selectedEipId) ?? visibleItems[0] ?? null,
    [selectedEipId, visibleItems],
  );

  const activeFilterCount = [
    filters.layer !== EIP_EXPLORER_DEFAULT_FILTERS.layer,
    filters.signal !== EIP_EXPLORER_DEFAULT_FILTERS.signal,
    filters.stage !== EIP_EXPLORER_DEFAULT_FILTERS.stage,
    filters.query.trim().length > 0,
  ].filter(Boolean).length;

  const updateFilters = (patch: Partial<EipExplorerFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const updateSort = (key: ExplorerSortKey) => {
    setSort((current) =>
      current.key === key
        ? { ...current, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: defaultSortDirection(key) },
    );
  };

  const selectItem = (item: EipExplorerItem) => {
    setSelectedEipId(item.eipId);
    if (window.matchMedia('(max-width: 1279px)').matches) {
      requestAnimationFrame(() => {
        mobilePreviewRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }
  };

  return (
    <section className="min-w-0 space-y-4" aria-label="Glamsterdam EIPs">
      {(devnetError || complexityError) && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          {devnetError ? 'Active devnet status could not be loaded. ' : ''}
          {complexityError ? 'Test complexity data could not be loaded.' : ''}
        </div>
      )}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="min-w-0" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
          <EipControls
            filters={filters}
            counts={filterCounts}
            hasActiveFilters={activeFilterCount > 0}
            onClearFilters={() => setFilters(EIP_EXPLORER_DEFAULT_FILTERS)}
            onFilterChange={updateFilters}
          />

          <div id="glamsterdam-eip-viewer" ref={mobilePreviewRef} className="mt-4 scroll-mt-4 xl:hidden" style={{ width: 'min(100%, calc(100vw - 2rem))' }}>
            <MobileSectionLabel
              label="Viewing"
              value={selectedItem ? `${selectedItem.proposalType}-${selectedItem.eipId}` : undefined}
              actionHref="#glamsterdam-eip-selector"
              actionLabel="Change"
            />
            <EipPreview item={selectedItem} />
          </div>

          <div
            id="glamsterdam-eip-selector"
            className="mt-4 scroll-mt-24 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 xl:mt-3"
            style={{ width: 'min(100%, calc(100vw - 2rem))' }}
          >
            <MobileSectionLabel label="Select EIP" value={`${visibleItems.length} shown`} attached />
            <EipListHeader sort={sort} onSort={updateSort} />
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {visibleItems.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  No EIPs match these filters.
                </div>
              ) : (
                visibleItems.map((item) => (
                  <EipListRow
                    key={item.eipId}
                    item={item}
                    selected={selectedItem?.eipId === item.eipId}
                    onSelect={() => selectItem(item)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="hidden min-w-0 xl:sticky xl:top-6 xl:block xl:self-start">
          <EipPreview item={selectedItem} />
        </aside>
      </div>
    </section>
  );
};

interface FilterCounts {
  stages: Record<ExplorerStageFilter, number>;
  layers: Record<EipExplorerFilters['layer'], number>;
  signals: Record<ExplorerSignalFilter, number>;
}

interface EipControlsProps {
  filters: EipExplorerFilters;
  counts: FilterCounts;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onFilterChange: (patch: Partial<EipExplorerFilters>) => void;
}

const EipControls: React.FC<EipControlsProps> = ({ filters, counts, hasActiveFilters, onClearFilters, onFilterChange }) => (
  <div
    className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
    style={{ width: 'min(100%, calc(100vw - 2rem))' }}
  >
    <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(160px,0.45fr)_minmax(200px,0.55fr)] xl:items-end">
      <FacetGroup label="Stage">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {stageFilterOptions.map((option) => (
            <FacetButton
              key={option.value}
              label={option.label}
              description={option.description}
              count={counts.stages[option.value]}
              active={filters.stage === option.value}
              onClick={() => onFilterChange({ stage: option.value })}
            />
          ))}
        </div>
      </FacetGroup>

      <FacetGroup label="Layer">
        <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1 dark:bg-slate-900">
          {layerFilterOptions.map((layer) => (
            <SegmentButton
              key={layer.value}
              label={layer.label}
              count={counts.layers[layer.value]}
              active={filters.layer === layer.value}
              onClick={() => onFilterChange({ layer: layer.value })}
            />
          ))}
        </div>
      </FacetGroup>

      <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="glamsterdam-eip-search">
        Search
        <div className="relative">
          <SearchIcon />
          <input
            id="glamsterdam-eip-search"
            value={filters.query}
            onChange={(event) => onFilterChange({ query: event.target.value })}
            placeholder="EIP, title, client"
            className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-purple-600 dark:focus:bg-slate-950 dark:focus:ring-purple-900/40"
          />
        </div>
      </label>
    </div>

    <div className="mt-3 min-w-0">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Highlights</div>
        <button
          type="button"
          onClick={onClearFilters}
          aria-hidden={!hasActiveFilters}
          tabIndex={hasActiveFilters ? 0 : -1}
          className={`text-xs font-medium text-purple-600 transition-opacity hover:text-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:text-purple-400 dark:hover:text-purple-300 dark:focus-visible:ring-purple-700 ${
            hasActiveFilters ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          Clear filters
        </button>
      </div>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {signalOptions.map((option) => (
          <FacetButton
            key={option.value}
            label={option.label}
            description={option.description}
            count={counts.signals[option.value]}
            active={filters.signal === option.value}
            onClick={() => onFilterChange({ signal: option.value })}
          />
        ))}
      </div>
    </div>
  </div>
);

const MobileSectionLabel: React.FC<{
  label: string;
  value?: string;
  attached?: boolean;
  actionHref?: string;
  actionLabel?: string;
}> = ({ label, value, attached = false, actionHref, actionLabel }) => (
  <div
    className={`flex items-center justify-between gap-3 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 xl:hidden ${
      attached ? 'border-b border-slate-200 bg-slate-50 px-4 pt-3 dark:border-slate-700 dark:bg-slate-900/40' : ''
    }`}
  >
    <span>{label}</span>
    <span className="flex items-center gap-3">
      {value && <span className="font-mono normal-case tracking-normal text-slate-400 dark:text-slate-500">{value}</span>}
      {actionHref && actionLabel && (
        <a href={actionHref} className="normal-case tracking-normal text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">
          {actionLabel}
        </a>
      )}
    </span>
  </div>
);

interface FacetGroupProps {
  label: string;
  children: React.ReactNode;
}

const FacetGroup: React.FC<FacetGroupProps> = ({ label, children }) => (
  <div className="min-w-0">
    <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
    {children}
  </div>
);

interface FacetButtonProps {
  label: string;
  description?: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}

const FacetButton: React.FC<FacetButtonProps> = ({ label, description, count, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    title={description}
    className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
      active
        ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700'
    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-700`}
  >
    <span>{label}</span>
    {count !== undefined && <span className={active ? 'text-white/70 dark:text-slate-950/60' : 'text-slate-400'}>{count}</span>}
  </button>
);

interface SegmentButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

const SegmentButton: React.FC<SegmentButtonProps> = ({ label, count, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
      active
        ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-slate-100'
        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-700`}
  >
    <span>{label}</span>
    <span className="ml-1 text-slate-400">{count}</span>
  </button>
);

interface EipListHeaderProps {
  sort: typeof EIP_EXPLORER_DEFAULT_SORT;
  onSort: (key: ExplorerSortKey) => void;
}

const EipListHeader: React.FC<EipListHeaderProps> = ({ sort, onSort }) => (
  <div className="hidden grid-cols-[minmax(220px,1fr)_70px_145px_128px_142px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400 lg:grid">
    <SortHeader label="EIP" sortKey="eip" sort={sort} onSort={onSort} />
    <SortHeader label="Stage" sortKey="stage" sort={sort} onSort={onSort} />
    <SortHeader label="Devnet status" sortKey="devnets" sort={sort} onSort={onSort} />
    <SortHeader label="Test complexity" sortKey="complexity" sort={sort} onSort={onSort} />
    <SortHeader label="Client priority" sortKey="client-priority" sort={sort} onSort={onSort} />
  </div>
);

interface SortHeaderProps {
  label: string;
  sortKey: ExplorerSortKey;
  sort: typeof EIP_EXPLORER_DEFAULT_SORT;
  onSort: (key: ExplorerSortKey) => void;
}

const SortHeader: React.FC<SortHeaderProps> = ({ label, sortKey, sort, onSort }) => (
  <button
    type="button"
    onClick={() => onSort(sortKey)}
    aria-sort={sort.key === sortKey ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    className="inline-flex items-center gap-1.5 text-left transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:text-slate-800 dark:hover:text-slate-200 dark:focus-visible:text-slate-200"
  >
    {label}
    {sort.key === sortKey && (
      <span className="text-[10px] leading-none text-purple-600 dark:text-purple-300" aria-hidden="true">
        {sort.direction === 'asc' ? '▲' : '▼'}
      </span>
    )}
  </button>
);

interface EipListRowProps {
  item: EipExplorerItem;
  selected: boolean;
  onSelect: () => void;
}

const EipListRow: React.FC<EipListRowProps> = ({ item, selected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`block w-full px-4 py-3 text-left transition-colors ${
      selected
        ? 'bg-purple-50/80 dark:bg-purple-950/20'
        : 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/30'
    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-300 dark:focus-visible:ring-purple-700`}
  >
    <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_70px_145px_128px_142px] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <HeadlinerGlyph status={item.headlinerStatus} />
          <span className="font-mono text-sm font-medium text-purple-700 dark:text-purple-300">
            {item.proposalType}-{item.eipId}
          </span>
          <LayerBadge layer={item.layer} />
        </div>
        <div className="mt-1 line-clamp-1 text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</div>
      </div>

      <MetaCell label="Stage">
        <StageBadge stage={item.stage} />
      </MetaCell>
      <MetaCell label="Devnet">
        <DevnetStatus item={item} />
      </MetaCell>
      <MetaCell label="Complexity">
        <ComplexityBadge item={item} />
      </MetaCell>
      <MetaCell label="Client priority">
        <ClientPriorityBadge item={item} />
      </MetaCell>
    </div>
  </button>
);

const MetaCell: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2 dark:bg-slate-900/30 lg:block lg:bg-transparent lg:p-0 dark:lg:bg-transparent">
    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 lg:hidden">{label}</span>
    <div className="min-w-0 text-right lg:text-left">{children}</div>
  </div>
);

const EipPreview: React.FC<{ item: EipExplorerItem | null }> = ({ item }) => {
  if (!item) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        Select an EIP to preview its fork metadata.
      </div>
    );
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <header className="border-b border-slate-200 p-3 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          <HeadlinerGlyph status={item.headlinerStatus} />
          <span className="font-mono text-sm font-medium text-purple-700 dark:text-purple-300">
            {item.proposalType}-{item.eipId}
          </span>
          <LayerBadge layer={item.layer} />
          <HeadlinerBadge status={item.headlinerStatus} />
        </div>
        <h3 className="mt-2 text-lg font-medium leading-snug text-slate-950 dark:text-slate-100">{item.title}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={`/eips/${item.eipId}`}
            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Forkcast EIP
          </Link>
          <a
            href={item.specificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Spec
            <ExternalLinkIcon />
          </a>
          {item.discussionUrl && (
            <a
              href={item.discussionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Discussion
              <ExternalLinkIcon />
            </a>
          )}
        </div>
      </header>

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        <SnapshotSection title="Active devnets">
          {item.activeDevnets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {item.activeDevnets.map((devnet) => (
                <DevnetChip key={`${devnet.id}-${devnet.optional ? 'optional' : 'required'}`} devnet={devnet} />
              ))}
            </div>
          ) : (
            <EmptyState text="Not currently included in an active devnet." />
          )}
        </SnapshotSection>

        <SnapshotSection title="Client priority">
          <PrioritySnapshot item={item} />
        </SnapshotSection>

        <SnapshotSection title="Test complexity">
          {item.complexity ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <ComplexityBadge item={item} expanded />
                <a
                  href={item.complexity.assessmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  STEEL assessment
                  <ExternalLinkIcon />
                </a>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Anchor scores</div>
              <AnchorList item={item} />
            </div>
          ) : (
            <EmptyState text="No test complexity assessment available." />
          )}
        </SnapshotSection>

        <SnapshotSection title="Timeline">
          <EipMiniTimeline item={item} />
        </SnapshotSection>
      </div>
    </article>
  );
};

const SnapshotSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="p-3">
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h4>
    {children}
  </section>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
    {text}
  </p>
);

const LayerBadge: React.FC<{ layer: EipExplorerItem['layer'] }> = ({ layer }) => {
  if (!layer) return null;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
        layer === 'EL'
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
          : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
      }`}
    >
      {layer}
    </span>
  );
};

const StageBadge: React.FC<{ stage: InclusionStage }> = ({ stage }) => (
  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${getInclusionStageColor(stage)}`}>
    <span className="font-mono">{stageCode(stage)}</span>
  </span>
);

const HeadlinerGlyph: React.FC<{ status: HeadlinerStatus }> = ({ status }) => {
  if (status === 'none') return null;
  const label = status === 'selected' ? 'Selected headliner' : 'Headliner candidate';
  return (
    <Tooltip text={label}>
      <span className={status === 'selected' ? 'text-purple-600 dark:text-purple-300' : 'text-slate-400 dark:text-slate-500'}>
        {status === 'selected' ? '★' : '☆'}
      </span>
    </Tooltip>
  );
};

const HeadlinerBadge: React.FC<{ status: HeadlinerStatus }> = ({ status }) => {
  if (status === 'none') return null;
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        status === 'selected'
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
      }`}
    >
      {status === 'selected' ? 'Selected headliner' : 'Headliner candidate'}
    </span>
  );
};

const DevnetStatus: React.FC<{ item: EipExplorerItem }> = ({ item }) => {
  if (item.activeDevnets.length === 0) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">Not active</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-300">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
      {item.activeDevnets.length} active
    </span>
  );
};

const DevnetChip: React.FC<{ devnet: EipExplorerItem['activeDevnets'][number] }> = ({ devnet }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${getDevnetColor(devnet.series)}`}
    title={devnet.optional ? `${devnet.id} optional` : devnet.id}
  >
    <span>{devnet.id}</span>
    {devnet.optional && <span className="text-[10px] opacity-70">optional</span>}
    {devnet.isTarget && <span className="text-[10px] opacity-70">target</span>}
  </span>
);

const ComplexityBadge: React.FC<{ item: EipExplorerItem; expanded?: boolean }> = ({ item, expanded = false }) => {
  if (!item.complexity) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">Not assessed</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium ${expanded ? 'text-sm' : 'text-xs'} ${getComplexityTierColor(item.complexity.tier)}`}>
      <span>{item.complexity.tier}</span>
      <span className="font-mono">{item.complexity.totalScore}</span>
    </span>
  );
};

const ClientPriorityBadge: React.FC<{ item: EipExplorerItem; expanded?: boolean }> = ({ item, expanded = false }) => {
  const priority = item.clientPriority;
  const tone = getClientPriorityTone(priority.tier);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-medium ${expanded ? 'text-sm' : 'text-xs'} ${tone.badge}`}>
      <span>{priority.label}</span>
      {priority.score !== null && (
        <span className="font-mono opacity-75">{expanded ? `${priority.score.toFixed(1)}/5` : priority.score.toFixed(1)}</span>
      )}
    </span>
  );
};

const PrioritySnapshot: React.FC<{ item: EipExplorerItem }> = ({ item }) => {
  const priority = item.clientPriority;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ClientPriorityBadge item={item} expanded />
        <span className="text-xs text-slate-500 dark:text-slate-400">{clientPrioritySummary(priority.tier)}</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {priority.stanceCount} teams · {priority.supportCount} support · {priority.neutralCount} neutral · {priority.opposeCount} oppose
      </p>
      {item.priority && priority.stanceCount > 0 && <ClientMatrix stances={item.priority.stances} />}
    </div>
  );
};

const AnchorList: React.FC<{ item: EipExplorerItem }> = ({ item }) => {
  const anchors = item.complexity?.anchors
    .sort((a, b) => {
      const scoreComparison = b.score - a.score;
      return scoreComparison === 0 ? a.name.localeCompare(b.name) : scoreComparison;
    }) ?? [];

  if (anchors.length === 0) {
    return <EmptyState text="No anchor scores listed." />;
  }

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-1 rounded border border-slate-200 p-2 dark:border-slate-700 sm:grid-cols-2 xl:grid-cols-2">
      {anchors.map((anchor) => (
        <div key={anchor.name} className="flex min-w-0 items-center gap-2 py-0.5" title={`${anchor.name}: ${anchor.score}`}>
          <AnchorScoreMarker score={anchor.score} />
          <span
            className={`min-w-0 truncate text-xs ${
              anchor.score > 0
                ? 'text-slate-700 dark:text-slate-200'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {anchor.name}
          </span>
        </div>
      ))}
    </div>
  );
};

const AnchorScoreMarker: React.FC<{ score: number }> = ({ score }) => {
  if (score > 3) {
    return (
      <span className="inline-flex h-4 w-6 shrink-0 items-center justify-center rounded bg-red-200/70 font-mono text-[10px] font-semibold text-red-700 dark:bg-red-600/40 dark:text-red-100">
        {score}
      </span>
    );
  }

  return (
    <span className="flex shrink-0 gap-0.5" aria-label={`Score ${score}`}>
      {[1, 2, 3].map((level) => (
        <span
          key={level}
          className={`h-2 w-2 rounded-sm ${
            score >= level
              ? level === 1
                ? 'bg-amber-400'
                : level === 2
                  ? 'bg-orange-500'
                  : 'bg-red-500'
              : 'bg-slate-200 dark:bg-slate-600'
          }`}
        />
      ))}
    </span>
  );
};

type MiniTimelineItem =
  | {
      kind: 'status';
      key: string;
      label: string;
      date: string | null;
      call: EipExplorerItem['stageHistory'][number]['call'];
      timestamp?: number;
      isCurrent: boolean;
      tone: { dot: string; badge: string };
    }
  | {
      kind: 'presentation';
      key: string;
      label: string;
      date: string;
      call?: EipExplorerItem['presentationHistory'][number]['call'];
      link?: string;
      timestamp?: number;
      isCurrent: false;
      tone: { dot: string; badge: string };
    };

const EipMiniTimeline: React.FC<{ item: EipExplorerItem }> = ({ item }) => {
  const timelineItems = buildMiniTimelineItems(item);

  if (timelineItems.length === 0) {
    return <EmptyState text="No timeline history recorded." />;
  }

  return (
    <ol className="relative space-y-2 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
      {timelineItems.map((entry) => (
        <li key={entry.key} className="relative pl-5">
          <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-800 ${entry.tone.dot}`} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${entry.tone.badge}`}>
                {entry.label}
              </span>
              {entry.isCurrent && <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">current</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span>{entry.date ? formatTimelineDate(entry.date) : 'No date recorded'}</span>
              {entry.call && (
                <>
                  <span aria-hidden="true">·</span>
                  <CallReferenceLink call={entry.call} timestamp={entry.timestamp} />
                </>
              )}
              {!entry.call && entry.kind === 'presentation' && entry.link && (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={entry.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-purple-600 underline decoration-slate-300 underline-offset-2 hover:text-purple-800 dark:text-purple-400 dark:decoration-slate-600 dark:hover:text-purple-300"
                  >
                    source
                    <ExternalLinkIcon />
                  </a>
                </>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
};

const CallReferenceLink: React.FC<{ call: NonNullable<EipExplorerItem['stageHistory'][number]['call']>; timestamp?: number }> = ({
  call,
  timestamp,
}) => {
  const { display, link } = formatCallReference(call, timestamp);
  return (
    <Link
      to={link}
      className="font-medium text-purple-600 underline decoration-slate-300 underline-offset-2 hover:text-purple-800 dark:text-purple-400 dark:decoration-slate-600 dark:hover:text-purple-300"
    >
      {display}
    </Link>
  );
};

const ClientMatrix: React.FC<{ stances: ClientStance[] }> = ({ stances }) => (
  <div className="grid gap-4">
    <ClientGroup title="EL" clients={getELClients()} stances={stances} />
    <ClientGroup title="CL" clients={getCLClients()} stances={stances} />
  </div>
);

const ClientGroup: React.FC<{ title: string; clients: string[]; stances: ClientStance[] }> = ({ title, clients, stances }) => (
  <div>
    <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{title} clients</div>
    <div className="flex flex-wrap gap-1.5">
      {clients.map((client) => {
        const stance = stances.find((candidate) => candidate.clientName === client);
        const score = stance?.normalizedScore ?? null;
        const tooltip = stance
          ? `${client}: ${getRatingLabel(stance.ratingSystem, stance.rawRating)}${stance.comment ? ` - ${stance.comment}` : ''}`
          : `${client}: No stance recorded`;

        return (
          <Tooltip key={client} text={tooltip}>
            <span className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold ${getScoreColor(score, Boolean(stance))}`}>
              {getClientInitials(client)}
            </span>
          </Tooltip>
        );
      })}
    </div>
  </div>
);

const SearchIcon: React.FC = () => (
  <svg className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
  </svg>
);

const ExternalLinkIcon: React.FC = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

function getDevnetColor(series: string): string {
  switch (series.toUpperCase()) {
    case 'BAL':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
    case 'EPBS':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
    case 'GLAMSTERDAM':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }
}

function buildMiniTimelineItems(item: EipExplorerItem): MiniTimelineItem[] {
  const latestStageIndex = item.stageHistory.length - 1;
  const statusItems: MiniTimelineItem[] = item.stageHistory.map((event, index) => ({
    kind: 'status',
    key: `status-${event.status}-${event.date ?? index}-${event.call ?? 'no-call'}`,
    label: statusTimelineLabel(event.status),
    date: event.date,
    call: event.call,
    timestamp: event.timestamp,
    isCurrent: index === latestStageIndex,
    tone: getTimelineStatusTone(event.status),
  }));

  const presentationItems: MiniTimelineItem[] = item.presentationHistory.map((event, index) => ({
    kind: 'presentation',
    key: `presentation-${event.type}-${event.date}-${event.call ?? event.link ?? index}`,
    label: presentationTimelineLabel(event.type),
    date: event.date,
    call: event.call,
    link: event.link,
    timestamp: event.timestamp,
    isCurrent: false,
    tone: {
      dot: 'bg-purple-500',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    },
  }));

  return [...statusItems, ...presentationItems].sort((a, b) => {
    if (a.kind === 'status' && a.isCurrent) return -1;
    if (b.kind === 'status' && b.isCurrent) return 1;

    const timestampA = timelineTimestamp(a.date);
    const timestampB = timelineTimestamp(b.date);
    if (timestampA === null && timestampB === null) return 0;
    if (timestampA === null) return 1;
    if (timestampB === null) return -1;
    return timestampB - timestampA;
  });
}

function getTimelineStatusTone(status: EipExplorerItem['stageHistory'][number]['status']): MiniTimelineItem['tone'] {
  switch (status) {
    case 'Included':
    case 'Scheduled':
      return {
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      };
    case 'Considered':
      return {
        dot: 'bg-amber-500',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
      };
    case 'Proposed':
      return {
        dot: 'bg-blue-500',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      };
    case 'Declined':
      return {
        dot: 'bg-red-500',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      };
    case 'Withdrawn':
      return {
        dot: 'bg-slate-400',
        badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      };
  }
}

function statusTimelineLabel(status: EipExplorerItem['stageHistory'][number]['status']): string {
  switch (status) {
    case 'Considered':
      return 'CFI';
    case 'Proposed':
      return 'PFI';
    case 'Scheduled':
      return 'SFI';
    case 'Declined':
      return 'DFI';
    default:
      return status;
  }
}

function presentationTimelineLabel(type: EipExplorerItem['presentationHistory'][number]['type']): string {
  switch (type) {
    case 'headliner_proposal':
      return 'Headliner proposal';
    case 'headliner_presentation':
      return 'Headliner presentation';
    case 'presentation':
      return 'Presented';
    case 'debate':
      return 'Debated';
  }
}

function formatCallReference(call: string, timestamp?: number): { display: string; link: string } {
  const [prefix, number] = call.split('/');
  const paddedNumber = number.padStart(3, '0');
  const baseLink = `/calls/${prefix}/${paddedNumber}`;
  return {
    display: `${prefix.toUpperCase()} #${number}`,
    link: timestamp ? `${baseLink}#t=${timestamp}` : baseLink,
  };
}

function formatTimelineDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function timelineTimestamp(dateString: string | null): number | null {
  if (!dateString) return null;
  return new Date(`${dateString}T00:00:00`).getTime();
}

function getClientPriorityTone(tier: ClientPriorityTier): { badge: string } {
  switch (tier) {
    case 'strong-support':
      return { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    case 'support':
      return { badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' };
    case 'split':
      return { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' };
    case 'low-support':
      return { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' };
    case 'no-signal':
      return { badge: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' };
  }
}

function clientPrioritySummary(tier: ClientPriorityTier): string {
  switch (tier) {
    case 'strong-support':
      return 'Broad client preference';
    case 'support':
      return 'Positive client signal';
    case 'split':
      return 'Support and opposition both recorded';
    case 'low-support':
      return 'Weak client signal';
    case 'no-signal':
      return 'No recorded client signal';
  }
}

function buildFilterCounts(items: EipExplorerItem[]): FilterCounts {
  const stages = Object.fromEntries(stageFilterOptions.map((option) => [option.value, 0])) as Record<ExplorerStageFilter, number>;
  const layers = { all: items.length, EL: 0, CL: 0 };
  const signals = Object.fromEntries(signalOptions.map((option) => [option.value, 0])) as Record<ExplorerSignalFilter, number>;

  for (const item of items) {
    if (isActiveExplorerStage(item.stage)) stages.active += 1;
    stages.all += 1;
    stages[item.stage] = (stages[item.stage] ?? 0) + 1;

    if (item.layer === 'EL' || item.layer === 'CL') {
      layers[item.layer] += 1;
    }

    signals.all += 1;
    if (item.headlinerStatus !== 'none') signals.headliners += 1;
    if (item.activeDevnets.length > 0) signals['active-devnet'] += 1;
    if (item.complexity?.tier === 'High') signals['high-complexity'] += 1;
    if (item.complexity === null) signals.unassessed += 1;
    if (item.clientPriority.tier === 'split') signals.contested += 1;
  }

  return { stages, layers, signals };
}

function defaultSortDirection(key: ExplorerSortKey): typeof EIP_EXPLORER_DEFAULT_SORT.direction {
  return key === 'eip' || key === 'stage' ? 'asc' : 'desc';
}

function stageCode(stage: InclusionStage): string {
  switch (stage) {
    case 'Proposed for Inclusion':
      return 'PFI';
    case 'Considered for Inclusion':
      return 'CFI';
    case 'Scheduled for Inclusion':
      return 'SFI';
    case 'Declined for Inclusion':
      return 'DFI';
    case 'Included':
      return 'IN';
    case 'Withdrawn':
      return 'W';
    case 'Unknown':
      return '?';
  }
}

export default EipsTab;
