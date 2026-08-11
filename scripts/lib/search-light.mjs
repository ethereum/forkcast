/**
 * Builds the "light" search corpus: call summaries only (tldr + notes +
 * key_decisions), no transcripts or chat.
 *
 * The heavy corpus (`public/search-corpus.json`, ~19 MB) can only be an opt-in
 * download. This tier is small enough to fetch on the first global-search open
 * from any page, so summaries are always findable.
 *
 * Pure by design — `readJson` is injected so tests can pass an in-memory map.
 */

const asArray = (value) => (Array.isArray(value) ? value : []);

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

const DEFAULT_TIMESTAMP = '00:00:00';

/** Highlights, action items, decisions and targets from a `tldr.json`. */
export function entriesFromTldr(tldr) {
  if (!tldr || typeof tldr !== 'object') return [];
  const entries = [];

  const highlights = tldr.highlights;
  if (highlights && typeof highlights === 'object') {
    for (const [category, items] of Object.entries(highlights)) {
      for (const item of asArray(items)) {
        const text = trimmed(item?.highlight);
        if (!text) continue;
        entries.push({
          kind: 'highlight',
          timestamp: trimmed(item?.timestamp) || DEFAULT_TIMESTAMP,
          text,
          category,
        });
      }
    }
  }

  for (const item of asArray(tldr.decisions)) {
    const text = trimmed(item?.decision);
    if (!text) continue;
    entries.push({ kind: 'decision', timestamp: trimmed(item?.timestamp) || DEFAULT_TIMESTAMP, text });
  }

  for (const item of asArray(tldr.action_items)) {
    const text = trimmed(item?.action);
    if (!text) continue;
    const entry = { kind: 'action', timestamp: trimmed(item?.timestamp) || DEFAULT_TIMESTAMP, text };
    const owner = trimmed(item?.owner);
    if (owner) entry.owner = owner;
    entries.push(entry);
  }

  for (const item of asArray(tldr.targets)) {
    const text = trimmed(item?.target);
    if (!text) continue;
    entries.push({ kind: 'target', timestamp: trimmed(item?.timestamp) || DEFAULT_TIMESTAMP, text });
  }

  return entries;
}

/** Notes sections: heading + summary + full body, so notes bodies are searchable. */
export function entriesFromNotes(notes) {
  if (!notes || typeof notes !== 'object') return [];

  const entries = [];
  for (const section of asArray(notes.sections)) {
    const heading = trimmed(section?.heading);
    const text = [heading, trimmed(section?.summary), trimmed(section?.body)]
      .filter(Boolean)
      .join('\n');
    if (!text) continue;
    entries.push({
      kind: 'note',
      timestamp: trimmed(section?.timestamp) || DEFAULT_TIMESTAMP,
      heading,
      text,
    });
  }
  return entries;
}

/**
 * Decisions from `key_decisions.json`. These are the human-corrected record and
 * take precedence over `tldr.decisions`, which has drifted from them before.
 */
export function entriesFromKeyDecisions(keyDecisions) {
  if (!keyDecisions || typeof keyDecisions !== 'object') return [];

  const entries = [];
  for (const item of asArray(keyDecisions.key_decisions)) {
    const text = trimmed(item?.original_text);
    if (!text) continue;
    entries.push({ kind: 'decision', timestamp: trimmed(item?.timestamp) || DEFAULT_TIMESTAMP, text });
  }
  return entries;
}

/** Suffixes of `tldr_{kind}.json` / `notes_{kind}.json` artifacts present on disk. */
function discoverBreakoutKinds(config, listFiles) {
  const declared = Object.keys(config?.breakouts ?? {});
  const found = new Set();

  for (const file of listFiles?.() ?? []) {
    const match = /^(?:tldr|notes)_(.+)\.json$/.exec(file);
    if (match) found.add(match[1]);
  }

  for (const kind of found) {
    if (!declared.includes(kind)) {
      console.warn(`Indexing breakout artifact "${kind}" not listed in config.breakouts`);
      declared.push(kind);
    }
  }

  return declared.sort();
}

/**
 * One record for the main call, plus one per bundled breakout kind. Records with
 * no entries are dropped by the caller.
 *
 * Legacy `src/data/breakouts.ts` sub-calls are chat-only (no tldr/notes), so they
 * contribute nothing here and are deliberately not walked.
 */
export function buildCallRecords(call, readJson, listFiles) {
  const { type, date, number } = call;
  const base = { type, date, number, path: `${type}/${number}` };

  const makeRecord = (extra, tldr, notes, entries) => {
    const meeting = trimmed(tldr?.meeting) || trimmed(notes?.meeting);
    return { ...base, ...extra, ...(meeting ? { meeting } : {}), entries };
  };

  const tldr = readJson('tldr.json');
  const notes = readJson('notes.json');
  const keyDecisions = readJson('key_decisions.json');

  const records = [
    makeRecord({}, tldr, notes, [
      ...entriesFromTldr(
        // key_decisions.json wins when present; never list both, that would double up.
        keyDecisions ? { ...tldr, decisions: [] } : tldr,
      ),
      ...entriesFromKeyDecisions(keyDecisions),
      ...entriesFromNotes(notes),
    ]),
  ];

  for (const kind of discoverBreakoutKinds(readJson('config.json'), listFiles)) {
    const breakoutTldr = readJson(`tldr_${kind}.json`);
    const breakoutNotes = readJson(`notes_${kind}.json`);
    records.push(
      makeRecord({ breakout: kind }, breakoutTldr, breakoutNotes, [
        ...entriesFromTldr(breakoutTldr),
        ...entriesFromNotes(breakoutNotes),
      ]),
    );
  }

  return records;
}

/**
 * @param calls entries from `protocol-calls.generated.json`
 * @param readJson `(call, relPath) => object | null`
 * @param listFiles `(call) => string[]` — file names in the call's artifact dir
 */
export function buildLightCorpus(calls, readJson, listFiles) {
  const records = calls.flatMap((call) =>
    buildCallRecords(
      call,
      (relPath) => readJson(call, relPath),
      listFiles ? () => listFiles(call) : undefined,
    ),
  );

  return { version: 1, calls: records.filter((record) => record.entries.length > 0) };
}
