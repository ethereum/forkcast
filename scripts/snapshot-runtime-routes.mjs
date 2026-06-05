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
 * The upcoming-call parser mirrors src/domain/calls/upcomingCalls.ts (which is
 * unit-tested). On a network failure the previous snapshot is kept so offline
 * and CI builds still succeed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// --- Upcoming-call parsing (mirrors src/domain/calls/upcomingCalls.ts) ---------

const UTC_DATE_TIME_SECTION_RE =
  /### UTC Date & Time[\s\S]{0,200}?([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}),\s*(\d{1,2}):(\d{2})\s*UTC/i;
const CALL_SERIES_SECTION_RE = /### Call Series\s*\n\s*\n([^\n\r]+)/i;

const UPCOMING_CALL_SERIES_TO_TYPE = {
  'all core devs - consensus': 'acdc',
  'all core devs - execution': 'acde',
  'all core devs - testing': 'acdt',
  'all wallet devs': 'awd',
  'pq interop': 'pqi',
  'pq transaction signatures': 'pqts',
  'l1-zkevm breakout': 'zkevm',
  'fast confirmation rule': 'fcr',
  'rpc standards': 'rpc',
  'focil breakout': 'focil',
  'eip-7928 breakout room': 'bal',
  'eip-7732 breakout room': 'epbs',
  'glamsterdam repricings': 'price',
  'trustless log index': 'tli',
  'encrypt the mempool': 'etm',
  'native account abstraction': 'aa',
  'p2p networking': 'p2p',
};

const normalizeCallSeries = (series) => series.trim().toLowerCase().replace(/\s+/g, ' ');

const resolveTypeFromTitle = (title) => {
  if (/\(ACDC\)/i.test(title)) return 'acdc';
  if (/\(ACDE\)/i.test(title)) return 'acde';
  if (/\(ACDT\)/i.test(title)) return 'acdt';
  if (/EIP-7732|ePBS/i.test(title)) return 'epbs';
  if (/EIP-7928/i.test(title)) return 'bal';
  if (/FOCIL/i.test(title)) return 'focil';
  if (/RPC Standards/i.test(title)) return 'rpc';
  if (/L1-zkEVM/i.test(title)) return 'zkevm';
  if (/\(PQTS\)|Post Quantum transaction signature/i.test(title)) return 'pqts';
  if (/(?:Post-Quantum\s*\(PQ\)|PQ)\s*Interop/i.test(title)) return 'pqi';
  if (/Fast Confirmation Rule|\(FCR\)/i.test(title)) return 'fcr';
  if (/All\s*Wallet\s*Devs|AllWalletDevs/i.test(title)) return 'awd';
  return undefined;
};

const resolveType = (title, body) => {
  const seriesMatch = body?.match(CALL_SERIES_SECTION_RE);
  if (seriesMatch) {
    const fromSeries = UPCOMING_CALL_SERIES_TO_TYPE[normalizeCallSeries(seriesMatch[1])];
    if (fromSeries) return fromSeries;
  }
  return resolveTypeFromTitle(title);
};

const parseCallDate = (dateStr) => {
  const match = dateStr.match(/([A-Za-z]+\s+\d{1,2},\s*\d{4})/);
  const clean = match ? match[1] : dateStr.trim();
  const date = new Date(clean);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resolveSchedule = (body) => {
  const match = body?.match(UTC_DATE_TIME_SECTION_RE);
  if (!match) return undefined;
  const date = parseCallDate(match[1]);
  if (!date) return undefined;
  const hours = String(Number(match[2])).padStart(2, '0');
  return { date, startTimeUtc: `${date}T${hours}:${match[3]}:00Z` };
};

const resolveNumber = (title) => {
  const match = title.match(/#\s*(\d+)/);
  return match ? match[1].padStart(3, '0') : undefined;
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
    const comments = await res.json();
    for (const comment of comments) {
      const match = comment.body?.match(/YouTube Live.*?\[.*?\]\((https?:\/\/[^\s)]+)\)/i);
      if (match) return match[1];
    }
  } catch {
    // Ignore — the watch page still works without an embedded video URL.
  }
  return undefined;
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
    const schedule = resolveSchedule(issue.body);
    if (!schedule) continue;
    const type = resolveType(issue.title, issue.body);
    const number = resolveNumber(issue.title);
    if (!type || !number) continue;

    const call = {
      type,
      title: issue.title.trim(),
      date: schedule.date,
      startTimeUtc: schedule.startTimeUtc,
      number,
      githubUrl: issue.html_url,
      issueNumber: issue.number,
    };

    if (bucketDate(call) < today) continue;
    if (foundTypes.has(type)) continue;
    if (completedIds.has(`${type}-${number}`)) continue;

    parsed.push(call);
    foundTypes.add(type);
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

const keepExisting = (file, fallback, label) => {
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
    console.warn(`  ⚠ upcoming calls fetch failed: ${error.message}`);
    keepExisting(UPCOMING_CALLS_FILE, [], 'upcoming-calls');
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
    console.warn(`  ⚠ networks.json fetch failed: ${error.message}`);
    keepExisting(NETWORKS_FILE, { networkMetadata: {}, networks: {} }, 'devnet-networks');
  }
}

fs.mkdirSync(GENERATED_DIR, { recursive: true });
console.log('Snapshotting runtime-discovered routes...');
await Promise.all([snapshotUpcomingCalls(), snapshotNetworks()]);
console.log('✨ Snapshots ready.');
