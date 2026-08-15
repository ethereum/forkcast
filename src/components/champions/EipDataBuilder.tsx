import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { Champion, EIP, EipFaqItem, SupportingDocument } from '../../types/eip';
import { loadEips } from '../../domain/search/loadEips';
import { EMPTY_EIP_FILTERS, searchEips } from '../../domain/search/eipSearch';
import { getLaymanTitle } from '../../utils';
import { stakeholders } from '../../domain/eips/stakeholders';
import {
  applyDraft,
  CHAMPIONS_MAX,
  CLAIM_MAX_WORDS,
  countWords,
  draftFromEip,
  LAYMAN_DESCRIPTION_MAX_WORDS,
  serializeEip,
  validateDraft,
  type ChampionDraft,
  type DraftWarning,
} from '../../domain/champions/eipDraft';

const REPO_EDIT_BASE = 'https://github.com/ethereum/forkcast/edit/main/src/data/eips';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The real `/eips/{id}` card, rendered against the draft. Lazy because it pulls
 * in the full EIP dataset at module scope — nobody who only reads the guide
 * should pay for that.
 */
const EipContent = lazy(() =>
  import('../eip/EipContent').then((module) => ({ default: module.EipContent })),
);

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';
const textareaClass = `${inputClass} leading-relaxed`;
const smallButtonClass =
  'cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-purple-400 hover:text-purple-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-purple-600 dark:hover:text-purple-300';
const guideLinkClass =
  'cursor-pointer text-xs text-slate-400 underline decoration-dotted underline-offset-2 transition-colors hover:text-purple-600 dark:text-slate-500 dark:hover:text-purple-400';

// ---------------------------------------------------------------------------
// Field primitives
// ---------------------------------------------------------------------------

/**
 * `anchor` deep-links to the matching field card in the guide underneath. The
 * builder is an overlay, so following one closes it.
 */
const Field: React.FC<{
  anchor: string;
  label: string;
  rule: string;
  onFollowGuide: () => void;
  children: React.ReactNode;
}> = ({ anchor, label, rule, onFollowGuide, children }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-sm font-semibold text-purple-700 dark:text-purple-300">
        {label}
      </span>
      <a href={`#${anchor}`} onClick={onFollowGuide} className={guideLinkClass}>
        guide
      </a>
    </div>
    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{rule}</p>
    <div className="mt-2">{children}</div>
  </div>
);

const WordCount: React.FC<{ text: string; max: number }> = ({ text, max }) => {
  const count = countWords(text);
  return (
    <span
      // A target, not a cap — going over is never blocked, here or in validateDraft.
      title={`${count} words; aim for ~${max}`}
      className={`shrink-0 font-mono text-[0.6875rem] ${
        count > max ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
      }`}
    >
      {count}/~{max}
    </span>
  );
};

const RemoveButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
  >
    Remove
  </button>
);

function move<T>(list: T[], from: number, to: number): T[] {
  const out = [...list];
  out.splice(to, 0, ...out.splice(from, 1));
  return out;
}

/**
 * Drag-to-reorder for a list of rows. Order is meaningful — it is the order
 * readers see on the EIP page — and the rows are too tall to retype.
 *
 * The handle, not the row, is the drag source: the rows hold text inputs, which
 * must stay selectable. It also takes Arrow Up/Down so this works without a
 * pointer.
 */
function useReorder<T>(items: T[], onChange: (items: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  // Rows are keyed by index, so after a keyboard move focus is left on the
  // position rather than the row that moved — a second Arrow press would walk a
  // different row back. Chase the handle to where it landed.
  const pendingFocus = useRef<{ list: Element; index: number } | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    target.list.querySelectorAll<HTMLElement>('[data-reorder-handle]')[target.index]?.focus();
  });

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return {
    rowProps: (index: number) => ({
      'data-reorder-row': '',
      onDragOver: (e: React.DragEvent) => {
        if (dragIndex === null) return;
        e.preventDefault();
        setOverIndex(index);
      },
      onDrop: (e: React.DragEvent) => {
        if (dragIndex === null) return;
        e.preventDefault();
        if (dragIndex !== index) onChange(move(items, dragIndex, index));
        reset();
      },
      className: `transition-opacity ${dragIndex === index ? 'opacity-40' : ''} ${
        overIndex === index && dragIndex !== index
          ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900'
          : ''
      }`,
    }),
    handleProps: (index: number, label: string) => ({
      'data-reorder-handle': '',
      'aria-label': `Reorder ${label} ${index + 1}`,
      onDragStart: (e: React.DragEvent<HTMLButtonElement>) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        const row = e.currentTarget.closest('[data-reorder-row]');
        if (row) e.dataTransfer.setDragImage(row, 0, 0);
      },
      onDragEnd: reset,
      onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
        const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : -1;
        if (to < 0 || to >= items.length) return;
        e.preventDefault();
        const list = e.currentTarget.closest('[data-reorder-row]')?.parentElement;
        if (list) pendingFocus.current = { list, index: to };
        onChange(move(items, index, to));
      },
    }),
  };
}

const DragHandle: React.FC<React.ComponentProps<'button'>> = (props) => (
  <button
    type="button"
    draggable
    title="Drag to reorder"
    {...props}
    className="shrink-0 cursor-grab rounded-md px-1.5 py-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-300"
  >
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="7" cy="5" r="1.5" />
      <circle cx="13" cy="5" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7" cy="15" r="1.5" />
      <circle cx="13" cy="15" r="1.5" />
    </svg>
  </button>
);

const FaqRows: React.FC<{ items: EipFaqItem[]; onChange: (items: EipFaqItem[]) => void }> = ({
  items,
  onChange,
}) => {
  const { rowProps, handleProps } = useReorder(items, onChange);

  const patch = (index: number, changes: Partial<EipFaqItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const { className, ...row } = rowProps(index);
        return (
          <div key={index} {...row} className={`space-y-2 rounded-lg ${className}`}>
            <div className="flex items-center gap-2">
              <DragHandle {...handleProps(index, 'FAQ item')} />
              <input
                type="text"
                value={item.question}
                placeholder="What problem does it solve?"
                onChange={(e) => patch(index, { question: e.target.value })}
                className={inputClass}
              />
              <RemoveButton
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                label="Remove FAQ item"
              />
            </div>
            <textarea
              rows={4}
              value={item.answer}
              placeholder="Markdown supported: **bold**, lists, links, and blank lines for paragraphs."
              onChange={(e) => patch(index, { answer: e.target.value })}
              className={textareaClass}
            />
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...items, { question: '', answer: '' } as EipFaqItem])}
        className={smallButtonClass}
      >
        Add question
      </button>
    </div>
  );
};

/** Add/remove/reorder rows of single-claim strings, each with its word count. */
const ClaimRows: React.FC<{
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  addLabel: string;
  rowLabel: string;
  disabled?: boolean;
}> = ({ values, onChange, placeholder, addLabel, rowLabel, disabled = false }) => {
  const { rowProps, handleProps } = useReorder(values, onChange);

  return (
    <div className={`space-y-2 ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
      {values.map((value, index) => {
        const { className, ...row } = rowProps(index);
        return (
          <div key={index} {...row} className={`flex items-center gap-2 rounded-lg ${className}`}>
            <DragHandle {...handleProps(index, rowLabel)} />
            <input
              type="text"
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(values.map((v, i) => (i === index ? e.target.value : v)))}
              className={inputClass}
            />
            <WordCount text={value} max={CLAIM_MAX_WORDS} />
            <RemoveButton
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              label="Remove row"
            />
          </div>
        );
      })}
      <button type="button" onClick={() => onChange([...values, ''])} className={smallButtonClass}>
        {addLabel}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

const EipSearchField: React.FC<{ onSelect: (eip: EIP) => void }> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [eips, setEips] = useState<EIP[] | null>(null);

  // The EIP data is a 630 KB chunk; nobody who only reads the guide pays for it.
  useEffect(() => {
    if (query.trim() === '' || eips) return;
    let cancelled = false;
    loadEips().then((module) => {
      if (!cancelled) setEips(module.eipsData);
    });
    return () => {
      cancelled = true;
    };
  }, [query, eips]);

  const results = useMemo(() => {
    if (query.trim() === '' || !eips) return [];
    return searchEips(query, eips, EMPTY_EIP_FILTERS).slice(0, 8);
  }, [query, eips]);

  return (
    <div>
      <label
        htmlFor="builder-eip-lookup"
        className="block text-sm font-medium text-slate-900 dark:text-slate-100"
      >
        Which EIP are you writing about?
      </label>
      <input
        id="builder-eip-lookup"
        type="text"
        value={query}
        placeholder="EIP number or title, e.g. 8025"
        onChange={(e) => setQuery(e.target.value)}
        className={`${inputClass} mt-2`}
        autoComplete="off"
        autoFocus
      />
      {query.trim() !== '' && (
        <ul className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              {eips ? 'No matching EIP.' : 'Loading EIPs…'}
            </li>
          )}
          {results.map((result) => (
            <li key={result.eip.id}>
              <button
                type="button"
                onClick={() => onSelect(result.eip)}
                className="flex w-full cursor-pointer items-baseline gap-3 px-3 py-2 text-left transition-colors hover:bg-purple-50 dark:hover:bg-purple-950/30"
              >
                <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {result.eip.id}
                </span>
                <span className="truncate text-sm text-slate-800 dark:text-slate-200">
                  {getLaymanTitle(result.eip)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Preview / JSON panel
// ---------------------------------------------------------------------------

const PreviewPanel: React.FC<{
  eip: EIP;
  json: string;
  warnings: DraftWarning[];
  view: 'preview' | 'json';
  onViewChange: (view: 'preview' | 'json') => void;
  onFollowGuide: () => void;
}> = ({ eip, json, warnings, view, onViewChange, onFollowGuide }) => {
  const [copied, setCopied] = useState(false);
  // Collapsible so a long list does not push the preview off screen.
  const [warningsOpen, setWarningsOpen] = useState(true);

  const copyJson = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {(['preview', 'json'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewChange(mode)}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === mode
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {mode === 'preview' ? 'Preview' : 'JSON'}
          </button>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30">
          <button
            type="button"
            onClick={() => setWarningsOpen(!warningsOpen)}
            aria-expanded={warningsOpen}
            className="flex w-full cursor-pointer items-center gap-2 p-4 text-left text-sm font-semibold text-amber-900 dark:text-amber-200"
          >
            <svg
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${warningsOpen ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {warnings.length} thing{warnings.length === 1 ? '' : 's'} to look at
          </button>
          {warningsOpen && (
            <div className="px-4 pb-4">
              <ul className="space-y-1.5 text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/80">
                {warnings.map((warning, index) => (
                  <li key={index}>
                    <a
                      href={`#${warning.field}`}
                      onClick={onFollowGuide}
                      className="underline decoration-dotted underline-offset-2"
                    >
                      {warning.message}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-amber-800 dark:text-amber-300/80">
                Advisory only - none of the fields are strictly required.
              </p>
            </div>
          )}
        </div>
      )}

      {view === 'preview' ? (
        <div className="mt-3 overflow-y-auto rounded-lg lg:max-h-[calc(100vh-10rem)]">
          <Suspense
            fallback={<p className="text-sm text-slate-500 dark:text-slate-400">Loading preview…</p>}
          >
            <EipContent eip={eip} />
          </Suspense>
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyJson}
              className="cursor-pointer rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
            >
              {copied ? 'Copied!' : `Copy ${eip.id}.json`}
            </button>
            <a
              href={`${REPO_EDIT_BASE}/${eip.id}.json`}
              target="_blank"
              rel="noopener noreferrer"
              className={smallButtonClass}
            >
              Edit on GitHub
            </a>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            GitHub cannot be pre-filled from a link: open the file, select all, and paste over it.
            If the file does not exist yet, create it at{' '}
            <code className="font-mono">src/data/eips/{eip.id}.json</code>.
          </p>
          <pre className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 lg:max-h-[calc(100vh-14rem)] dark:border-slate-700 dark:bg-slate-900">
            <code className="font-mono text-[0.75rem] leading-relaxed text-slate-800 dark:text-slate-200">
              {json}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Launcher
// ---------------------------------------------------------------------------

const LauncherBar: React.FC<{ onOpen: () => void; autoFocus?: boolean }> = ({
  onOpen,
  autoFocus,
}) => (
  // Desktop only: the payoff is a side-by-side preview and a large JSON blob
  // pasted into GitHub's editor, and drag-to-reorder does not fire on touch.
  <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent px-4 pt-10 pb-4 lg:block dark:from-slate-900 dark:via-slate-900/90">
    <button
      type="button"
      onClick={onOpen}
      autoFocus={autoFocus}
      className="pointer-events-auto mx-auto flex w-full max-w-3xl cursor-pointer items-center gap-3 rounded-full bg-purple-600 py-3 pr-4 pl-5 text-left shadow-lg shadow-purple-600/25 transition hover:bg-purple-700 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 focus-visible:outline-none dark:focus-visible:ring-offset-slate-900"
    >
      <svg
        className="h-4 w-4 shrink-0 text-purple-200"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
      <span className="text-sm font-semibold text-white">Build your EIP data</span>
      <span className="hidden text-xs text-purple-200 sm:inline">
        Guided fields, a live preview, and a file to paste into GitHub
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
        Open
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </span>
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

const EipDataBuilder: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<EIP | null>(null);
  const [forkIndex, setForkIndex] = useState(0);
  const [draft, setDraft] = useState<ChampionDraft | null>(null);
  const [view, setView] = useState<'preview' | 'json'>('preview');
  // Champions are per fork relationship, so switching forks swaps them out.
  // Remember the edits so switching back does not silently discard them.
  const [championsByFork, setChampionsByFork] = useState<Record<number, Champion[]>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  /** Set on close so the launcher takes focus back when it remounts. */
  const restoreFocus = useRef(false);

  // `#builder` links in the guide open the builder rather than scrolling to it.
  useEffect(() => {
    const syncFromHash = () => {
      if (window.location.hash === '#builder') setOpen(true);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;

    // The guide underneath is only scroll-locked, so Tab would still walk into
    // it. Cycle within the dialog instead.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      // Picking an EIP unmounts the button that had focus, dropping it to
      // <body>; pull it back in rather than letting Tab escape to the guide.
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // The lookup field autofocuses itself; only take focus when nothing has.
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = () => {
    restoreFocus.current = true;
    setOpen(false);
    // Drop `#builder` so the same link can re-open it.
    if (window.location.hash === '#builder') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const selectEip = (eip: EIP) => {
    // Champions apply per fork relationship; default to the most recent one.
    const index = Math.max(0, eip.forkRelationships.length - 1);
    const next = draftFromEip(eip, index);
    setSelected(eip);
    setForkIndex(index);
    setDraft(next);
    setChampionsByFork({});
  };

  const selectFork = (index: number) => {
    if (!selected || !draft) return;
    const remembered = { ...championsByFork, [forkIndex]: draft.champions };
    setChampionsByFork(remembered);
    setForkIndex(index);
    setDraft({
      ...draft,
      champions:
        remembered[index] ??
        (selected.forkRelationships[index].champions ?? []).map((c) => ({ ...c })),
    });
  };

  const update = <K extends keyof ChampionDraft>(key: K, value: ChampionDraft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const merged = useMemo(
    () => (selected && draft ? applyDraft(selected, draft, forkIndex) : null),
    [selected, draft, forkIndex],
  );
  const warnings = useMemo(() => (draft ? validateDraft(draft) : []), [draft]);
  const json = merged ? serializeEip(merged) : '';

  // Nothing is persisted, and the preview is full of real links to other pages.
  // Anything that leaves /champions takes the draft with it, so ask first.
  const pristine = useMemo(() => (selected ? serializeEip(selected) : ''), [selected]);
  const isDirty = merged !== null && json !== pristine;
  useEffect(() => {
    if (!isDirty) return;
    const confirmLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', confirmLeave);
    return () => window.removeEventListener('beforeunload', confirmLeave);
  }, [isDirty]);

  if (!open) {
    return (
      <LauncherBar
        onOpen={() => {
          restoreFocus.current = false;
          setOpen(true);
        }}
        autoFocus={restoreFocus.current}
      />
    );
  }

  return (
    <div
      id="builder"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="EIP data builder"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-slate-50 outline-none dark:bg-slate-900"
    >
      {/* Header */}
      <header className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-200 px-4 py-3 sm:px-6 dark:border-slate-800">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
          EIP data builder
        </span>
        {selected && (
          <>
            <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
              EIP-{selected.id}
            </span>
            <span className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {getLaymanTitle(selected)}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setDraft(null);
              }}
              className={guideLinkClass}
            >
              change
            </button>
          </>
        )}
        <button type="button" onClick={close} className={`${smallButtonClass} ml-auto`}>
          Close (Esc)
        </button>
      </header>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {!selected || !draft || !merged ? (
          <div className="mx-auto max-w-xl">
            <EipSearchField onSelect={selectEip} />
            <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Fill in the guided fields and watch the real Forkcast rendering update as you type.
              Nothing is uploaded — when you are happy, copy the finished file and paste it into
              GitHub's editor.
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
            {/* ---------------------------------------------------------- Form */}
            <div className="min-w-0 space-y-6">
              {selected.forkRelationships.length > 1 && (
                <Field
                  anchor="smaller-fields"
                  label="fork relationship"
                  rule="Champions are recorded per fork. Pick the upgrade you are championing this EIP for."
                  onFollowGuide={close}
                >
                  <div className="flex flex-wrap gap-2">
                    {selected.forkRelationships.map((relationship, index) => (
                      <button
                        key={relationship.forkName}
                        type="button"
                        onClick={() => selectFork(index)}
                        className={`cursor-pointer rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                          index === forkIndex
                            ? 'border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300'
                            : 'border-slate-300 text-slate-600 hover:border-purple-400 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {relationship.forkName}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              <Field
                anchor="smaller-fields"
                label="layer"
                rule="Which client layer does this primarily affect?"
                onFollowGuide={close}
              >
                <div className="flex gap-2">
                  {(['EL', 'CL'] as const).map((layer) => (
                    <button
                      key={layer}
                      type="button"
                      onClick={() => update('layer', draft.layer === layer ? '' : layer)}
                      className={`cursor-pointer rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                        draft.layer === layer
                          ? 'border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300'
                          : 'border-slate-300 text-slate-600 hover:border-purple-400 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {layer}
                    </button>
                  ))}
                </div>
              </Field>

              <Field
                anchor="laymanDescription"
                label="laymanDescription"
                rule={`What changes, for someone who does not read specs. Plain language, no acronyms; aim for under ~${LAYMAN_DESCRIPTION_MAX_WORDS} words.`}
                onFollowGuide={close}
              >
                <textarea
                  rows={5}
                  value={draft.laymanDescription}
                  onChange={(e) => update('laymanDescription', e.target.value)}
                  className={textareaClass}
                />
                <div className="mt-1 flex justify-end">
                  <WordCount text={draft.laymanDescription} max={LAYMAN_DESCRIPTION_MAX_WORDS} />
                </div>
              </Field>

              <Field
                anchor="benefits"
                label="benefits"
                rule={`Each item is one claim a skeptical reader could check. Aim for four to six, ~${CLAIM_MAX_WORDS} words each.`}
                onFollowGuide={close}
              >
                <ClaimRows
                  values={draft.benefits}
                  onChange={(values) => update('benefits', values)}
                  placeholder="One concrete, checkable claim"
                  addLabel="Add benefit"
                  rowLabel="benefit"
                />
              </Field>

              <Field
                anchor="tradeoffs"
                label="tradeoffs"
                rule="An honest list buys more credibility than an empty one. Reviewers will find the costs anyway."
                onFollowGuide={close}
              >
                <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={draft.tradeoffs === null}
                    onChange={(e) => update('tradeoffs', e.target.checked ? null : [])}
                    className="cursor-pointer rounded border-slate-300 text-purple-600 focus:ring-purple-500 dark:border-slate-600"
                  />
                  There genuinely are none
                </label>
                <ClaimRows
                  values={draft.tradeoffs ?? []}
                  onChange={(values) => update('tradeoffs', values)}
                  placeholder="A cost, risk, or burden this introduces"
                  addLabel="Add trade-off"
                  rowLabel="trade-off"
                  disabled={draft.tradeoffs === null}
                />
              </Field>

              <Field
                anchor="stakeholderImpacts"
                label="stakeholderImpacts"
                rule={
                  'Fill in all eight — write "No impact." rather than leaving a key out, since an omitted key drops your EIP from the stakeholder view. Aim for ~20 words each.'
                }
                onFollowGuide={close}
              >
                <div className="space-y-4">
                  {stakeholders.map((stakeholder) => (
                    <div key={stakeholder.key}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-200">
                          {stakeholder.key}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            update('stakeholderImpacts', {
                              ...draft.stakeholderImpacts,
                              [stakeholder.key]: 'No impact.',
                            })
                          }
                          className={guideLinkClass}
                        >
                          No impact.
                        </button>
                      </div>
                      <p className="text-[0.6875rem] text-slate-400 dark:text-slate-500">
                        {stakeholder.audience}
                      </p>
                      <textarea
                        rows={2}
                        value={draft.stakeholderImpacts[stakeholder.key]}
                        onChange={(e) =>
                          update('stakeholderImpacts', {
                            ...draft.stakeholderImpacts,
                            [stakeholder.key]: e.target.value,
                          })
                        }
                        className={`${textareaClass} mt-1`}
                      />
                    </div>
                  ))}
                </div>
              </Field>

              <Field
                anchor="faq"
                label="faq"
                rule="Questions in the reader's voice. Each answer is deep-linkable on its own, so make it stand alone. Answers support markdown. Drag the handle to reorder."
                onFollowGuide={close}
              >
                <FaqRows items={draft.faq} onChange={(faq) => update('faq', faq)} />
              </Field>

              <Field
                anchor="smaller-fields"
                label="supportingDocuments"
                rule="Benchmarks, analyses, and prototype writeups — the evidence behind your benefits list."
                onFollowGuide={close}
              >
                <div className="space-y-2">
                  {draft.supportingDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={doc.label}
                        placeholder="Label"
                        onChange={(e) =>
                          update(
                            'supportingDocuments',
                            draft.supportingDocuments.map((d, i) =>
                              i === index ? { ...d, label: e.target.value } : d,
                            ),
                          )
                        }
                        className={`${inputClass} sm:w-1/3`}
                      />
                      <input
                        type="url"
                        value={doc.url}
                        placeholder="https://…"
                        onChange={(e) =>
                          update(
                            'supportingDocuments',
                            draft.supportingDocuments.map((d, i) =>
                              i === index ? { ...d, url: e.target.value } : d,
                            ),
                          )
                        }
                        className={inputClass}
                      />
                      <RemoveButton
                        onClick={() =>
                          update(
                            'supportingDocuments',
                            draft.supportingDocuments.filter((_, i) => i !== index),
                          )
                        }
                        label="Remove document"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      update('supportingDocuments', [
                        ...draft.supportingDocuments,
                        { label: '', url: '' } as SupportingDocument,
                      ])
                    }
                    className={smallButtonClass}
                  >
                    Add document
                  </button>
                </div>
              </Field>

              <Field
                anchor="smaller-fields"
                label="champions"
                rule={`At most ${CHAMPIONS_MAX} per fork. A name plus any contact, so client teams have a way to reach you.`}
                onFollowGuide={close}
              >
                <div className="space-y-3">
                  {draft.champions.map((champion, index) => (
                    <div
                      key={index}
                      className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={champion.name}
                          placeholder="Name"
                          onChange={(e) =>
                            update(
                              'champions',
                              draft.champions.map((c, i) =>
                                i === index ? { ...c, name: e.target.value } : c,
                              ),
                            )
                          }
                          className={inputClass}
                        />
                        <RemoveButton
                          onClick={() =>
                            update(
                              'champions',
                              draft.champions.filter((_, i) => i !== index),
                            )
                          }
                          label="Remove champion"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {(['discord', 'telegram', 'email'] as const).map((contact) => (
                          <input
                            key={contact}
                            type="text"
                            value={champion[contact] ?? ''}
                            placeholder={contact}
                            onChange={(e) =>
                              update(
                                'champions',
                                draft.champions.map((c, i) =>
                                  i === index ? { ...c, [contact]: e.target.value } : c,
                                ),
                              )
                            }
                            className={inputClass}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {draft.champions.length < CHAMPIONS_MAX && (
                    <button
                      type="button"
                      onClick={() =>
                        update('champions', [...draft.champions, { name: '' } as Champion])
                      }
                      className={smallButtonClass}
                    >
                      Add champion
                    </button>
                  )}
                </div>
              </Field>

              <Field
                anchor="smaller-fields"
                label="discussionLink"
                rule="The discussion thread, usually Ethereum Magicians."
                onFollowGuide={close}
              >
                <input
                  type="url"
                  value={draft.discussionLink}
                  placeholder="https://ethereum-magicians.org/t/…"
                  onChange={(e) => update('discussionLink', e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field
                anchor="how-to-submit"
                label="reviewer"
                rule="Marks the content as champion-authored rather than bot-generated."
                onFollowGuide={close}
              >
                <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={draft.reviewer === 'expert'}
                    // Unchecking restores whatever was there ("bot", usually)
                    // rather than deleting a field the champion did not author.
                    onChange={(e) =>
                      update('reviewer', e.target.checked ? 'expert' : (selected.reviewer ?? ''))
                    }
                    className="cursor-pointer rounded border-slate-300 text-purple-600 focus:ring-purple-500 dark:border-slate-600"
                  />
                  I am a champion or author of this EIP
                </label>
              </Field>
            </div>

            {/* ------------------------------------------------- Preview / JSON */}
            <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
              <PreviewPanel
                eip={merged}
                json={json}
                warnings={warnings}
                view={view}
                onViewChange={setView}
                onFollowGuide={close}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EipDataBuilder;
