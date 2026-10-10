/**
 * Freezes a build-time snapshot of the GitHub-hosted content that islands used to
 * fetch from the visitor's browser on every visit:
 *
 *   1. STEEL complexity assessments (ethspecs/pm, merged + open PRs) -> complexity-assessments.json
 *   2. Call agendas (ethereum/pm issue bodies)                        -> call-agendas.json
 *
 * Unauthenticated browser calls share GitHub's 60 requests/hour per IP, so on a shared
 * network (an interop event, a conference) the tabs broke for everyone. The deploy runs
 * this via `build:fresh` (authenticated with GITHUB_TOKEN), so the data is as fresh as
 * the last deploy.
 *
 * Like snapshot-runtime-routes.mjs, the outputs are committed generated data: normal
 * dev/build commands read the checked-in files as-is. Each file is written only on a
 * successful fetch, so a failed run leaves that committed snapshot untouched and exits
 * non-zero. Run after snapshot-runtime-routes.mjs: agendas cover the upcoming calls in
 * upcoming-calls.json as well as every completed call's config.json issue.
 *
 * Parsing is imported from the same modules the site uses (Node type-strips them on
 * import), so the snapshot and the UI cannot drift.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseComplexityMarkdown } from '../src/domain/complexity/complexity.ts';
import { extractAgendaMarkdown } from '../src/domain/calls/callAgenda.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = path.join(__dirname, '../src/data/generated');
const COMPLEXITY_FILE = path.join(GENERATED_DIR, 'complexity-assessments.json');
const AGENDAS_FILE = path.join(GENERATED_DIR, 'call-agendas.json');
const UPCOMING_CALLS_FILE = path.join(GENERATED_DIR, 'upcoming-calls.json');
const ARTIFACTS_DIR = path.join(__dirname, '../public/artifacts');

const COMPLEXITY_REPO = 'ethspecs/pm';
const ASSESSMENT_DIR = 'complexity_assessments/EIPs';
const PM_REPO = 'ethereum/pm';

const githubHeaders = () => {
  const headers = {
    'User-Agent': 'forkcast-build',
    Accept: 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
};

const githubJson = async (url) => {
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
};

/** Raw file text, or null on 404 (a PR whose branch does not carry the file). */
const rawText = async (url) => {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
};

const byEip = (a, b) => a.eipNumber - b.eipNumber;

// --- Complexity assessments ----------------------------------------------------

async function buildComplexitySnapshot() {
  const files = await githubJson(
    `https://api.github.com/repos/${COMPLEXITY_REPO}/contents/${ASSESSMENT_DIR}`,
  );
  const eipNumbers = files
    .map((file) => file.name.match(/^EIP-(\d+)\.md$/))
    .filter(Boolean)
    .map((match) => parseInt(match[1], 10))
    .sort((a, b) => a - b);

  const merged = [];
  for (const eipNumber of eipNumbers) {
    const markdown = await rawText(
      `https://raw.githubusercontent.com/${COMPLEXITY_REPO}/main/${ASSESSMENT_DIR}/EIP-${eipNumber}.md`,
    );
    if (markdown === null) throw new Error(`EIP-${eipNumber}.md listed but not found on main`);
    const complexity = parseComplexityMarkdown(markdown, eipNumber);
    if (complexity) merged.push(complexity);
  }

  // Assessments that so far only exist in an open pull request. The PR title names its
  // EIP ("Add EIP-1234 complexity assessment"); newest PR wins for the same EIP.
  const pulls = await githubJson(
    `https://api.github.com/repos/${COMPLEXITY_REPO}/pulls?state=open&per_page=100`,
  );
  const candidates = new Map();
  for (const pull of [...pulls].sort((a, b) => a.number - b.number)) {
    if (!pull.head.repo) continue;
    const match = pull.title.match(/EIP-?\s*(\d+)/i);
    if (!match) continue;
    candidates.set(parseInt(match[1], 10), pull);
  }

  const pending = [];
  for (const [eipNumber, pull] of candidates) {
    const repo = pull.head.repo.full_name;
    const filePath = `${ASSESSMENT_DIR}/EIP-${eipNumber}.md`;
    const markdown = await rawText(
      `https://raw.githubusercontent.com/${repo}/${pull.head.sha}/${filePath}`,
    );
    if (markdown === null) continue;
    const complexity = parseComplexityMarkdown(markdown, eipNumber, {
      assessmentUrl: `https://github.com/${repo}/blob/${pull.head.sha}/${filePath}`,
      pullRequest: {
        number: pull.number,
        url: pull.html_url,
        title: pull.title,
        isDraft: pull.draft,
      },
    });
    if (complexity) pending.push(complexity);
  }

  return { eipNumbers, merged: merged.sort(byEip), pending: pending.sort(byEip) };
}

// --- Call agendas --------------------------------------------------------------

/** Issue numbers the call pages can show an Agenda tab for. */
export function collectAgendaIssues(artifactsDir = ARTIFACTS_DIR, upcomingFile = UPCOMING_CALLS_FILE) {
  const issues = new Set();
  for (const entry of fs.readdirSync(artifactsDir, { recursive: true })) {
    if (path.basename(entry) !== 'config.json') continue;
    const { issue } = JSON.parse(fs.readFileSync(path.join(artifactsDir, entry), 'utf-8'));
    if (Number.isInteger(issue)) issues.add(issue);
  }
  try {
    for (const call of JSON.parse(fs.readFileSync(upcomingFile, 'utf-8'))) {
      if (Number.isInteger(call.issueNumber)) issues.add(call.issueNumber);
    }
  } catch {
    // No upcoming-calls snapshot yet.
  }
  return issues;
}

async function buildAgendasSnapshot() {
  const wanted = collectAgendaIssues();
  const oldest = Math.min(...wanted);
  const agendas = {};

  // Page through the repo's issues newest first, stopping once past the oldest one a call
  // page references: ~10 requests, rather than one per call.
  for (let page = 1; ; page++) {
    const issues = await githubJson(
      `https://api.github.com/repos/${PM_REPO}/issues?state=all&sort=created&direction=desc&per_page=100&page=${page}`,
    );
    for (const issue of issues) {
      if (wanted.has(issue.number)) agendas[issue.number] = extractAgendaMarkdown(issue.body ?? undefined);
    }
    if (issues.length < 100 || issues[issues.length - 1].number <= oldest) break;
  }

  const missing = [...wanted].filter((issue) => !(issue in agendas));
  if (missing.length) console.warn(`  ! no ${PM_REPO} issue found for #${missing.sort((a, b) => a - b).join(', #')}`);

  // Integer-like keys already serialize in ascending order, keeping the file byte-stable.
  return agendas;
}

// --- Main ----------------------------------------------------------------------

const writeJson = (file, data) => {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};

async function main() {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  console.log('Refreshing GitHub content snapshots...');

  const [complexity, agendas] = await Promise.allSettled([
    buildComplexitySnapshot(),
    buildAgendasSnapshot(),
  ]);

  let failed = false;
  if (complexity.status === 'fulfilled') {
    const { merged, pending } = complexity.value;
    writeJson(COMPLEXITY_FILE, complexity.value);
    console.log(`  ✓ complexity-assessments.json (${merged.length} merged, ${pending.length} pending)`);
  } else {
    failed = true;
    console.error(`✖ complexity snapshot failed: ${complexity.reason.message}`);
  }

  if (agendas.status === 'fulfilled') {
    writeJson(AGENDAS_FILE, agendas.value);
    console.log(`  ✓ call-agendas.json (${Object.keys(agendas.value).length} issues)`);
  } else {
    failed = true;
    console.error(`✖ agendas snapshot failed: ${agendas.reason.message}`);
  }

  if (failed) process.exit(1);
  console.log('✨ Snapshots ready.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
