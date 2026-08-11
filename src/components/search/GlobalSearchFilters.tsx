import {
  ACTIVE_FORKS,
  FORK_STATUSES,
  LAYERS,
  getForkDisplayName,
  type EipSearchFilters,
} from '../../domain/search/eipSearch';
import type { TranscriptFilters } from '../../domain/search/heavyTier';
import type { SummaryFilters } from '../../domain/search/lightCorpusSearch';
import type { LightEntryKind, SearchScope } from '../../domain/search/types';
import { SearchFilterButton, SearchFilterSelect } from './SearchUi';

const SUMMARY_KINDS: Array<'all' | LightEntryKind> = [
  'all',
  'highlight',
  'decision',
  'action',
  'target',
  'note',
];

const TRANSCRIPT_CALL_TYPES = ['all', 'ACDC', 'ACDE', 'ACDT'] as const;
const CONTENT_TYPES = ['all', 'transcript', 'chat'] as const;

const label = (value: string) => (value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1));

interface Props {
  scope: SearchScope;
  eipFilters: EipSearchFilters;
  onEipFilters: (filters: EipSearchFilters) => void;
  summaryFilters: SummaryFilters;
  onSummaryFilters: (filters: SummaryFilters) => void;
  /** Call-type slugs present in the light corpus, so the buttons can't offer an empty filter. */
  summaryCallTypes: string[];
  transcriptFilters: TranscriptFilters;
  onTranscriptFilters: (filters: TranscriptFilters) => void;
}

/** Filters are per-scope; `all` and `site` have none, so nothing renders there. */
export default function GlobalSearchFilters({
  scope,
  eipFilters,
  onEipFilters,
  summaryFilters,
  onSummaryFilters,
  summaryCallTypes,
  transcriptFilters,
  onTranscriptFilters,
}: Props) {
  if (scope === 'eips') {
    return (
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-4">
        <SearchFilterSelect
          value={eipFilters.forkName}
          onChange={(forkName) => onEipFilters({ ...eipFilters, forkName })}
        >
          <option value="all">All Forks</option>
          {ACTIVE_FORKS.map((fork) => (
            <option key={fork} value={fork}>
              {getForkDisplayName(fork)}
            </option>
          ))}
        </SearchFilterSelect>

        <SearchFilterSelect
          value={eipFilters.forkStatus}
          onChange={(forkStatus) => onEipFilters({ ...eipFilters, forkStatus })}
        >
          <option value="all">All Statuses</option>
          {FORK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </SearchFilterSelect>

        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />

        {(['all', ...LAYERS] as const).map((layer) => (
          <SearchFilterButton
            key={layer}
            active={eipFilters.layer === layer}
            onClick={() => onEipFilters({ ...eipFilters, layer })}
            tone="blue"
          >
            {layer === 'all' ? 'All Layers' : layer}
          </SearchFilterButton>
        ))}
      </div>
    );
  }

  if (scope === 'calls') {
    return (
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-4">
        {SUMMARY_KINDS.map((kind) => (
          <SearchFilterButton
            key={kind}
            active={summaryFilters.kind === kind}
            onClick={() => onSummaryFilters({ ...summaryFilters, kind })}
            tone="blue"
          >
            {label(kind)}
          </SearchFilterButton>
        ))}

        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />

        {['all', ...summaryCallTypes].map((callType) => (
          <SearchFilterButton
            key={callType}
            active={summaryFilters.callType === callType}
            onClick={() => onSummaryFilters({ ...summaryFilters, callType })}
            tone="purple"
          >
            {callType === 'all' ? 'All Calls' : callType.toUpperCase()}
          </SearchFilterButton>
        ))}
      </div>
    );
  }

  if (scope === 'transcripts') {
    return (
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-4">
        {CONTENT_TYPES.map((contentType) => (
          <SearchFilterButton
            key={contentType}
            active={transcriptFilters.contentType === contentType}
            onClick={() => onTranscriptFilters({ ...transcriptFilters, contentType })}
            tone="blue"
          >
            {label(contentType)}
          </SearchFilterButton>
        ))}

        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />

        {TRANSCRIPT_CALL_TYPES.map((callType) => (
          <SearchFilterButton
            key={callType}
            active={transcriptFilters.callType === callType}
            onClick={() => onTranscriptFilters({ ...transcriptFilters, callType })}
            tone="purple"
          >
            {callType === 'all' ? 'All Calls' : callType}
          </SearchFilterButton>
        ))}
      </div>
    );
  }

  return null;
}
