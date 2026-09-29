/**
 * Inverts the per-call `eip_mentions.json` artifacts into an EIP -> calls index.
 *
 * Deliberately small: it carries only what the EIP page needs *synchronously* —
 * which calls mentioned an EIP, and the sync offsets needed to turn a transcript
 * timestamp into a video position. The mention text itself stays in the per-call
 * artifacts and is fetched on demand, because at full coverage the bodies come to
 * ~3.7 MB and this file is imported into the page bundle.
 *
 * Pure by design — `readJson` and `listFiles` are injected so tests can pass an
 * in-memory map.
 */

/**
 * Bundled breakout kinds for a call, from `config.breakouts` plus any
 * `eip_mentions_{kind}.json` found on disk. Mirrors the same discovery in
 * `search-light.mjs`, which matches on tldr/notes instead.
 */
function discoverBreakoutKinds(config, listFiles) {
  const declared = Object.keys(config?.breakouts ?? {});
  const found = new Set();

  for (const file of listFiles?.() ?? []) {
    const match = /^eip_mentions_(.+)\.json$/.exec(file);
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

/** Only the two fields `getAdjustedVideoTime` reads, or null when unconfigured. */
function syncOf(config) {
  const sync = config?.sync;
  if (!sync?.transcriptStartTime || !sync?.videoStartTime) return null;
  return {
    transcriptStartTime: sync.transcriptStartTime,
    videoStartTime: sync.videoStartTime,
  };
}

/**
 * One source per call: the main recording, plus each bundled breakout. A breakout
 * is its own Zoom recording with its own offset, so its sync comes from
 * `config.breakouts[kind].sync` — using the parent's would be wrong by minutes.
 */
export function mentionSourcesForCall(call, readJson, listFiles) {
  const config = readJson('config.json');
  const sources = [];

  const main = readJson('eip_mentions.json');
  if (main) {
    sources.push({ suffix: '', sync: syncOf(config), data: main });
  }

  for (const kind of discoverBreakoutKinds(config, listFiles)) {
    const data = readJson(`eip_mentions_${kind}.json`);
    if (!data) continue;
    sources.push({ suffix: kind, sync: syncOf(config?.breakouts?.[kind]), data });
  }

  return sources;
}

/**
 * @param calls entries from `protocol-calls.generated.json` — the published gate.
 *   A call with artifacts but no entry here has no emitted page, so its mentions
 *   would link to a 404.
 * @param readJson `(call, relPath) => object | null`
 * @param listFiles `(call) => string[]`
 */
export function buildEipMentionsIndex(calls, readJson, listFiles) {
  const sources = [];

  for (const call of calls) {
    for (const source of mentionSourcesForCall(
      call,
      (relPath) => readJson(call, relPath),
      listFiles ? () => listFiles(call) : undefined,
    )) {
      const key = source.suffix ? `${call.path}:${source.suffix}` : call.path;
      sources.push({ call, key, ...source });
    }
  }

  const callsById = {};
  const eips = {};

  // Newest call first, matching how the tab reads.
  sources.sort((a, b) => b.call.date.localeCompare(a.call.date) || a.key.localeCompare(b.key));

  for (const source of sources) {
    // A file that names the same EIP twice must still list its call once — the
    // page keys each row on the call, so a repeat would collide.
    const ids = new Set();
    for (const entry of source.data?.eips ?? []) {
      if (!Number.isInteger(entry?.eip) || ids.has(entry.eip)) continue;
      ids.add(entry.eip);
      (eips[entry.eip] ??= []).push(source.key);
    }
    if (ids.size === 0) continue;

    callsById[source.key] = {
      path: source.call.path,
      type: source.call.type,
      number: source.call.number,
      date: source.call.date,
      ...(source.call.name ? { name: source.call.name } : {}),
      ...(source.suffix ? { breakout: source.suffix } : {}),
      sync: source.sync,
    };
  }

  return { version: 1, calls: callsById, eips };
}
