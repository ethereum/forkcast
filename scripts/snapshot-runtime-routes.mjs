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
 * The upcoming-call parsing rules are imported from the single source of truth in
 * src/domain/calls/upcomingCallParsing.ts (Node type-strips it on import), so the
 * tested domain parser and this build script can never drift. On a network
 * failure, local builds keep the previous snapshot so offline work still succeeds;
 * CI fails rather than ship stale route data (override with
 * `ALLOW_STALE_ROUTE_SNAPSHOTS=1`).
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

// CI/deploy builds must not silently ship a stale or empty route snapshot, so a
// fetch failure fails the build there. Local/offline builds keep the previous
// snapshot. ALLOW_STALE_ROUTE_SNAPSHOTS=1 opts CI back into the lenient behavior.
const FAIL_ON_STALE =
  process.env.CI === 'true' && process.env.ALLOW_STALE_ROUTE_SNAPSHOTS !== '1';

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

async function fetchYouTubeUrl(issueNumber) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/ethereum/pm/issues/${issueNumber}/comments`,
      { headers: githubHeaders() },
    );
    if (!res.ok) return undefined;
    return extractYouTubeUrl(await res.json());
  } catch {
    // Ignore — the watch page still works without an embedded video URL.
    return undefined;
  }
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
    .sort((a, b) => a.date.localeCompare(b.date));
}

// --- Snapshot helpers ----------------------------------------------------------

const writeJson = (file, data) => {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};

// On a fetch failure, fail the build in CI (don't ship stale/empty route data);
// otherwise keep the previous snapshot so local/offline builds still succeed.
const handleFetchFailure = (file, fallback, label, error) => {
  console.warn(`  ⚠ ${label} fetch failed: ${error.message}`);
  if (FAIL_ON_STALE) {
    throw new Error(
      `Refusing to build with a stale or empty ${label} snapshot in CI. ` +
        `Fix the fetch, or set ALLOW_STALE_ROUTE_SNAPSHOTS=1 to allow the previous snapshot.`,
    );
  }
  if (fs.existsSync(file)) {
    console.warn(`  ↺ keeping previous ${label} snapshot`);
    return;
  }
  writeJson(file, fallback);
  console.warn(`  ∅ wrote empty ${label} snapshot (no previous data)`);
};

async function snapshotUpcomingCalls() {
  try {
    const calls = await buildUpcomingCalls();
    writeJson(UPCOMING_CALLS_FILE, calls);
    console.log(`  ✓ upcoming-calls.json (${calls.length} calls)`);
  } catch (error) {
    handleFetchFailure(UPCOMING_CALLS_FILE, [], 'upcoming-calls', error);
  }
}

async function snapshotNetworks() {
  try {
    const res = await fetch(NETWORKS_URL);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const snapshot = {
      networkMetadata: data.networkMetadata ?? {},
      networks: data.networks ?? {},
    };
    writeJson(NETWORKS_FILE, snapshot);
    const activeCount = Object.values(snapshot.networks).filter(
      (n) => n?.status === 'active',
    ).length;
    console.log(
      `  ✓ devnet-networks.json (${Object.keys(snapshot.networks).length} networks, ${activeCount} active)`,
    );
  } catch (error) {
    handleFetchFailure(NETWORKS_FILE, { networkMetadata: {}, networks: {} }, 'devnet-networks', error);
  }
}

fs.mkdirSync(GENERATED_DIR, { recursive: true });
console.log('Snapshotting runtime-discovered routes...');
try {
  await Promise.all([snapshotUpcomingCalls(), snapshotNetworks()]);
} catch (error) {
  console.error(`✖ ${error.message}`);
  process.exit(1);
}
console.log('✨ Snapshots ready.');
