/**
 * Freezes a build-time snapshot of the two runtime-discovered data sources so
 * that Astro's `getStaticPaths()` and the hydrated React islands agree on which
 * routes exist:
 *
 *   1. Upcoming calls   (GitHub `ethereum/pm` open issues)  -> upcoming-calls.json
 *   2. Active devnets   (ethPandaOps cartographoor networks) -> devnet-networks.json
 *
 * Islands must never link to a route that the static build did not emit, so both
 * the route generator and the UI read these snapshots — not the live endpoints.
 *
 * These are committed generated data, like the repo's other compiled artifacts.
 * The normal dev/build commands read the checked-in files as-is; run this script
 * (e.g. via `build:fresh`) to refresh them from the live endpoints. It writes only
 * on a successful fetch, so a failed run leaves the committed snapshot untouched and
 * exits non-zero — just re-run when the upstream is reachable.
 *
 * The upcoming-call parsing rules are imported from the single source of truth in
 * src/domain/calls/upcomingCallParsing.ts (Node type-strips it on import), so the
 * tested domain parser and this build script can never drift.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseUpcomingCallFromIssue,
  extractYouTubeUrl,
} from '../src/domain/calls/upcomingCallParsing.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = path.join(__dirname, '../src/data/generated');
const UPCOMING_CALLS_FILE = path.join(GENERATED_DIR, 'upcoming-calls.json');
const NETWORKS_FILE = path.join(GENERATED_DIR, 'devnet-networks.json');
const PROTOCOL_CALLS_FILE = path.join(__dirname, '../src/data/protocol-calls.generated.json');

const GITHUB_ISSUES_URL =
  'https://api.github.com/repos/ethereum/pm/issues?state=open&per_page=20';
const NETWORKS_URL =
  'https://ethpandaops-platform-production-cartographoor.ams3.digitaloceanspaces.com/networks.json';

const githubHeaders = () => {
  const headers = {
    'User-Agent': 'forkcast-build',
    Accept: 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
};

// YYYY-MM-DD in UTC for the call's start. The runtime uses the viewer's timezone
// to bucket calls, but the build-time snapshot must be deterministic across build
// machines, so relevance here is evaluated in UTC. The island re-buckets by viewer
// timezone at render time, so a near-boundary call still displays correctly.
const bucketDate = (call) => {
  if (!call.startTimeUtc) return call.date;
  const start = new Date(call.startTimeUtc);
  if (Number.isNaN(start.getTime())) return call.date;
  return start.toISOString().slice(0, 10);
};

const todayUtc = () => new Date().toISOString().slice(0, 10);

export async function fetchYouTubeUrl(issueNumber) {
  const res = await fetch(
    `https://api.github.com/repos/ethereum/pm/issues/${issueNumber}/comments`,
    { headers: githubHeaders() },
  );

  if (!res.ok) throw new Error(`GitHub issue comments fetch failed for #${issueNumber}: ${res.status}`);

  // A successful comments fetch with no YouTube Live link means "no video yet".
  // A failed comments fetch is snapshot-critical because treating it the same
  // way could silently remove an already-emitted upcoming-call watch route.
  return extractYouTubeUrl(await res.json());
}

async function buildUpcomingCalls() {
  const completedIds = new Set();
  try {
    const calls = JSON.parse(fs.readFileSync(PROTOCOL_CALLS_FILE, 'utf-8'));
    for (const call of calls) completedIds.add(`${call.type}-${call.number}`);
  } catch {
    // No completed-call index yet; treat everything as potentially upcoming.
  }

  const res = await fetch(GITHUB_ISSUES_URL, { headers: githubHeaders() });
  if (!res.ok) throw new Error(`GitHub issues fetch failed: ${res.status}`);
  const issues = await res.json();

  const today = todayUtc();
  const foundTypes = new Set();
  const parsed = [];

  for (const issue of issues) {
    const call = parseUpcomingCallFromIssue(issue);
    if (!call) continue;
    if (bucketDate(call) < today) continue;
    if (foundTypes.has(call.type)) continue;
    if (completedIds.has(`${call.type}-${call.number}`)) continue;

    parsed.push(call);
    foundTypes.add(call.type);
  }

  const youtubeUrls = await Promise.all(parsed.map((call) => fetchYouTubeUrl(call.issueNumber)));
  return parsed
    .map((call, index) => ({ ...call, youtubeUrl: youtubeUrls[index] }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.issueNumber - b.issueNumber);
}

// --- Snapshot helpers ----------------------------------------------------------

// Recursively sort object keys so the committed snapshot is byte-stable even if
// the upstream API reorders keys within network/metadata entries (not just the
// top-level maps). Array order is preserved — only object keys are reordered — so
// meaningful arrays like `networkNames` (sorted explicitly below) and `links` keep
// their order.
const sortKeysDeep = (value) => {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, sortKeysDeep(child)]),
    );
  }
  return value;
};

const canonicalizeNetworksSnapshot = (raw) => {
  const networkMetadata = {};
  for (const [key, value] of Object.entries(raw.networkMetadata ?? {})) {
    networkMetadata[key] = {
      ...value,
      stats: {
        ...value.stats,
        networkNames: [...(value.stats?.networkNames ?? [])].sort(),
      },
    };
  }

  const networks = {};
  for (const [key, value] of Object.entries(raw.networks ?? {})) {
    const { lastUpdated: _lastUpdated, ...stableNetwork } = value;
    networks[key] = stableNetwork;
  }

  return sortKeysDeep({ networkMetadata, networks });
};

const writeJson = (file, data) => {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};

async function buildNetworksSnapshot() {
  const res = await fetch(NETWORKS_URL);
  if (!res.ok) throw new Error(`networks fetch failed: ${res.status}`);
  return canonicalizeNetworksSnapshot(await res.json());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  console.log('Refreshing route snapshots...');
  try {
    // Fetch + build both snapshots before writing either, so a partial failure leaves
    // the committed snapshots untouched: the builds run concurrently and a rejection
    // here propagates before any file is written.
    const [upcomingCalls, networksSnapshot] = await Promise.all([
      buildUpcomingCalls(),
      buildNetworksSnapshot(),
    ]);

    writeJson(UPCOMING_CALLS_FILE, upcomingCalls);
    console.log(`  ✓ upcoming-calls.json (${upcomingCalls.length} calls)`);

    const activeCount = Object.values(networksSnapshot.networks).filter(
      (n) => n?.status === 'active',
    ).length;
    writeJson(NETWORKS_FILE, networksSnapshot);
    console.log(
      `  ✓ devnet-networks.json (${Object.keys(networksSnapshot.networks).length} networks, ${activeCount} active)`,
    );
  } catch (error) {
    // Nothing is written until both fetches succeed, so the committed snapshots are
    // left intact. Exit non-zero and re-run when the upstream is reachable.
    console.error(`✖ snapshot refresh failed: ${error.message}`);
    process.exit(1);
  }
  console.log('✨ Snapshots ready.');
}
