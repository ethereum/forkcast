import React, { useState } from 'react';
import type { EipSpecHistory as EipSpecHistoryType, EipSpecCommit } from '../../types/eip';

interface EipSpecHistoryProps {
  eipId: number;
  history: EipSpecHistoryType | null;
  loading: boolean;
  error: string | null;
}

const INITIAL_DISPLAY_COUNT = 20;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function cleanMessage(message: string): string {
  // Remove trailing PR reference like (#1234)
  let cleaned = message.replace(/\s*\(#\d+\)\s*$/, '').trim();
  // Strip redundant EIP prefix: "Update EIP-7702: ...", "Add EIP-7702: ...", "EIP-7702: ..."
  cleaned = cleaned.replace(/^(?:Update|Add|Move|Rename)\s+EIP-\d+:\s*/i, '').trim();
  cleaned = cleaned.replace(/^EIP-\d+:\s*/, '').trim();
  // Capitalize first letter after stripping
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

function getDiffStats(patch: string): { additions: number; deletions: number } | null {
  let additions = 0;
  let deletions = 0;
  for (const line of patch.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }
  if (additions === 0 && deletions === 0) return null;
  return { additions, deletions };
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'hunk';
  content: string;
}

function parsePatch(patch: string): DiffLine[] {
  return patch.split('\n').map((line) => {
    if (line.startsWith('@@')) return { type: 'hunk', content: line };
    if (line.startsWith('+')) return { type: 'add', content: line.slice(1) };
    if (line.startsWith('-')) return { type: 'remove', content: line.slice(1) };
    return { type: 'context', content: line.startsWith(' ') ? line.slice(1) : line };
  });
}

const InlineDiff: React.FC<{ patch: string }> = ({ patch }) => {
  const lines = parsePatch(patch);

  return (
    <div className="mt-2 rounded border border-slate-200 dark:border-slate-600 overflow-x-auto text-xs font-mono">
      {lines.map((line, i) => {
        if (line.type === 'hunk') {
          return (
            <div key={i} className="px-3 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 select-none">
              {line.content}
            </div>
          );
        }

        const bgClass =
          line.type === 'add'
            ? 'bg-emerald-50 dark:bg-emerald-900/20'
            : line.type === 'remove'
              ? 'bg-red-50 dark:bg-red-900/20'
              : '';

        const textClass =
          line.type === 'add'
            ? 'text-emerald-800 dark:text-emerald-300'
            : line.type === 'remove'
              ? 'text-red-800 dark:text-red-300'
              : 'text-slate-600 dark:text-slate-400';

        const prefix =
          line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';

        return (
          <div key={i} className={`px-3 py-0 whitespace-pre-wrap break-all ${bgClass} ${textClass}`}>
            <span className="select-none opacity-50 mr-2">{prefix}</span>
            {line.content}
          </div>
        );
      })}
    </div>
  );
};

const ExternalLinkIcon: React.FC = () => (
  <svg className="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const CommitEntry: React.FC<{ commit: EipSpecCommit; expanded: boolean; onToggle: () => void }> = ({ commit, expanded, onToggle }) => {
  const stats = commit.patch ? getDiffStats(commit.patch) : null;

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug break-words">
          {cleanMessage(commit.message)}
        </p>
        {stats && (
          <span className="shrink-0 text-xs font-mono whitespace-nowrap pt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400">+{stats.additions}</span>
            {' '}
            <span className="text-red-500 dark:text-red-400">-{stats.deletions}</span>
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 dark:text-slate-400">
        <span>{formatDate(commit.date)}</span>
        <span>
          by{' '}
          <a
            href={`https://github.com/${commit.author}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {commit.author}
          </a>
        </span>
        {(commit.prNumber || commit.sha) && (
          <>
            <span className="text-slate-300 dark:text-slate-500">|</span>
            {commit.prNumber && (
              <a
                href={`https://github.com/ethereum/EIPs/pull/${commit.prNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-400 hover:underline underline-offset-2 inline-flex items-center gap-1"
              >
                PR #{commit.prNumber} <ExternalLinkIcon />
              </a>
            )}
            {!commit.prNumber && (
              <a
                href={`https://github.com/ethereum/EIPs/commit/${commit.sha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-400 hover:underline underline-offset-2 inline-flex items-center gap-1"
              >
                Commit <ExternalLinkIcon />
              </a>
            )}
          </>
        )}
      </div>
      {commit.patch && (
        <button
          onClick={onToggle}
          className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-purple-400 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        >
          <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {expanded ? 'Hide diff' : 'Show diff'}
        </button>
      )}
      {expanded && commit.patch && <InlineDiff patch={commit.patch} />}
    </div>
  );
};

export const EipSpecHistory: React.FC<EipSpecHistoryProps> = ({
  eipId,
  history,
  loading,
  error,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [expandedShas, setExpandedShas] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading history...
      </div>
    );
  }

  if (error || !history || history.commits.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
        <a
          href={`https://github.com/ethereum/EIPs/commits/master/EIPS/eip-${eipId}.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 dark:text-purple-400 underline underline-offset-2"
        >
          View history on GitHub
        </a>
      </p>
    );
  }

  const commits = history.commits;
  const displayedCommits = showAll
    ? commits
    : commits.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = commits.length > INITIAL_DISPLAY_COUNT;
  const hasPatchCommits = displayedCommits.some((c) => c.patch);

  const toggleCommit = (sha: string) => {
    setExpandedShas((prev) => {
      const next = new Set(prev);
      if (next.has(sha)) next.delete(sha);
      else next.add(sha);
      return next;
    });
    setAllExpanded(false);
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedShas(new Set());
      setAllExpanded(false);
    } else {
      setExpandedShas(new Set(displayedCommits.filter((c) => c.patch).map((c) => c.sha)));
      setAllExpanded(true);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
          Spec Change History
        </h3>
        <div className="flex items-center gap-3">
          {hasPatchCommits && (
            <button
              onClick={toggleAll}
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {commits.length} {commits.length === 1 ? 'change' : 'changes'}
          </span>
        </div>
      </div>

      <div className="relative">
        {displayedCommits.map((commit, index) => {
          const isLast = index === displayedCommits.length - 1;
          const isExpanded = allExpanded ? !!commit.patch : expandedShas.has(commit.sha);

          return (
            <div key={commit.sha} className="relative flex gap-3">
              {/* Timeline dot and line */}
              <div className="relative w-2.5 shrink-0 flex flex-col items-center pt-1">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-400 dark:bg-slate-500" />
                {!isLast && (
                  <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mb-[-4px]" />
                )}
              </div>

              {/* Content */}
              <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-4'}`}>
                <CommitEntry
                  commit={commit}
                  expanded={isExpanded}
                  onToggle={() => toggleCommit(commit.sha)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more button */}
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-4 w-full text-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
        >
          Show all {commits.length} changes
        </button>
      )}
    </div>
  );
};
