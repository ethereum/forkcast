/**
 * The Hegotá headliner devnet tracks are named after the fork's two halves:
 * the FOCIL track is `heze-devnet-*` (CL) and the Frames track `bogota-devnet-*`
 * (EL). ethPandaOps renamed them from `focil-*`/`frames-*` on 2026-10-13, moving
 * the HackMD specs, the GitHub repos and the devnet hostnames in one go.
 *
 * Cartographoor is regenerated from its own config and still publishes the old
 * series keys, so every name that enters the repo from upstream passes through
 * here. Once cartographoor catches up the map is a no-op on its output — new
 * names map to themselves.
 */
export const DEVNET_SERIES_RENAMES = {
  focil: 'heze',
  frames: 'bogota',
};

const SERIES_PATTERN = new RegExp(
  `\\b(${Object.keys(DEVNET_SERIES_RENAMES).join('|')})(-devnets?\\b)`,
  'g',
);

// Only ethPandaOps' own repos moved. The ethereum org's keep the pre-rename
// series in release tags and branch names — `tests-focil-devnet@v0.3.0` resolves
// and the heze spelling 404s — so a URL into one is copied through untouched.
const PROTECTED_URL_PATTERN = /https?:\/\/[\w.-]*github(?:usercontent)?\.com\/ethereum\/\S*/gi;

const renameOutsideUrls = (value) =>
  value.replace(SERIES_PATTERN, (_, series, suffix) => DEVNET_SERIES_RENAMES[series] + suffix);

/**
 * Rewrite every renamed series name inside a string: network keys
 * ("focil-devnet-1"), repo slugs ("ethpandaops/focil-devnets") and the devnet
 * hostnames and URLs built from either. Prose is untouched — only the
 * `{series}-devnet` compound is matched, never a bare "FOCIL".
 */
export function renameDevnetSeries(value) {
  let out = '';
  let cursor = 0;
  for (const match of value.matchAll(PROTECTED_URL_PATTERN)) {
    out += renameOutsideUrls(value.slice(cursor, match.index)) + match[0];
    cursor = match.index + match[0].length;
  }
  return out + renameOutsideUrls(value.slice(cursor));
}

/** Rename a bare category key ("focil" → "heze"), leaving unknown keys alone. */
export function renameDevnetSeriesKey(key) {
  return DEVNET_SERIES_RENAMES[key] ?? key;
}

/** Deep-rename every string in a JSON-serialisable value. */
export function renameDevnetSeriesDeep(value) {
  if (typeof value === 'string') return renameDevnetSeries(value);
  if (Array.isArray(value)) return value.map(renameDevnetSeriesDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, renameDevnetSeriesDeep(child)]),
    );
  }
  return value;
}

const LEGACY_PATTERN = new RegExp(
  `^(${Object.values(DEVNET_SERIES_RENAMES).join('|')})(-devnets?\\b.*)$`,
);
const LEGACY_SERIES = Object.fromEntries(
  Object.entries(DEVNET_SERIES_RENAMES).map(([legacy, current]) => [current, legacy]),
);

/**
 * The pre-rename id for a renamed devnet ("bogota-devnet-0" → "frames-devnet-0"),
 * or null for every other id. Upstreams that still key on the old name — notably
 * cartographoor — are looked up under this.
 */
export function legacyDevnetId(id) {
  const match = id.match(LEGACY_PATTERN);
  return match ? LEGACY_SERIES[match[1]] + match[2] : null;
}
