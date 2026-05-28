import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFrontmatter, mapOfficialToLocal } from './lib/eip-parsing.mjs';
import {
  buildNewEipJson,
  getPendingPullRequestNumber,
  pendingPullRequest,
  updateExistingEip,
} from './eip-record-sync.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EIPS_DIR = path.join(__dirname, '../src/data/eips');
const EIPS_MD_DIR = path.join(__dirname, '../public/eips');
const PR_MANIFEST_PATH = path.join(EIPS_MD_DIR, 'pr-manifest.json');
const BATCH_SIZE = 3;
const BATCH_DELAY = 500;

function parseArgs() {
  const args = process.argv.slice(2);
  const prArg = args.find((a) => a.startsWith('--pr='));
  return {
    help: args.includes('--help') || args.includes('-h'),
    singlePr: prArg ? parseInt(prArg.split('=')[1], 10) : null,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAuthHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn(
      'Warning: GITHUB_TOKEN not set. Using unauthenticated requests (60 req/hr limit).',
    );
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

function loadPrManifest() {
  if (!fs.existsSync(PR_MANIFEST_PATH)) {
    return { lastRun: null, prs: {} };
  }
  try {
    const manifest = JSON.parse(fs.readFileSync(PR_MANIFEST_PATH, 'utf8'));
    return { lastRun: manifest.lastRun ?? null, prs: manifest.prs ?? {} };
  } catch {
    return { lastRun: null, prs: {} };
  }
}

function getTrackedEipIds() {
  const ids = new Set();
  const files = fs
    .readdirSync(EIPS_DIR)
    .filter((f) => /^\d+\.json$/.test(f));

  for (const file of files) {
    const id = parseInt(file.replace('.json', ''), 10);
    ids.add(id);
  }
  return ids;
}

/**
 * Fetch open PRs from ethereum/EIPs, paginating until we hit PRs older than lastRun.
 */
async function fetchOpenPrs(headers, lastRun) {
  const allPrs = [];
  let page = 1;
  let done = false;

  while (!done) {
    const url = `https://api.github.com/repos/ethereum/EIPs/pulls?state=open&sort=updated&direction=desc&per_page=100&page=${page}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch PRs: HTTP ${response.status}`);
    }

    const prs = await response.json();
    if (prs.length === 0) break;

    for (const pr of prs) {
      // Stop paginating when we hit PRs older than last run
      if (lastRun && new Date(pr.updated_at) < new Date(lastRun)) {
        done = true;
        break;
      }
      allPrs.push({
        number: pr.number,
        updatedAt: pr.updated_at,
        head: pr.head,
      });
    }

    page++;
    await sleep(BATCH_DELAY);
  }

  return allPrs;
}

async function fetchPrState(prNumber, headers) {
  const url = `https://api.github.com/repos/ethereum/EIPs/pulls/${prNumber}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch PR #${prNumber}: HTTP ${response.status}`);
  }

  const pr = await response.json();
  return {
    number: pr.number,
    state: pr.state,
    updatedAt: pr.updated_at,
  };
}

/**
 * Fetch file list for a PR and return added EIP filenames.
 */
async function fetchPrEipFiles(prNumber, headers) {
  const allFiles = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/repos/ethereum/EIPs/pulls/${prNumber}/files?per_page=100&page=${page}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch files for PR #${prNumber}: HTTP ${response.status}`,
      );
    }

    const files = await response.json();
    allFiles.push(...files);
    if (files.length < 100) break;

    page++;
    await sleep(BATCH_DELAY);
  }

  return allFiles
    .filter(
      (f) =>
        f.status === 'added' && /^EIPS\/eip-\d+\.md$/.test(f.filename),
    )
    .map((f) => {
      const match = f.filename.match(/eip-(\d+)\.md$/);
      return parseInt(match[1], 10);
    });
}

/**
 * Fetch raw EIP content from a PR branch.
 */
async function fetchEipFromPrBranch(prNumber, eipNumber, headers) {
  const url = `https://raw.githubusercontent.com/ethereum/EIPs/refs/pull/${prNumber}/head/EIPS/eip-${eipNumber}.md`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch EIP-${eipNumber} from PR #${prNumber}: HTTP ${response.status}`,
    );
  }
  return await response.text();
}

/**
 * Process a single PR: fetch its EIP files, parse, and create/update JSON.
 */
async function processPr(prNumber, headers, trackedEipIds, requiresFilter) {
  const eipNumbers = await fetchPrEipFiles(prNumber, headers);
  if (eipNumbers.length === 0) return { eipNumbers: [] };

  const candidates = [];

  for (const eipNumber of eipNumbers) {
    const content = await fetchEipFromPrBranch(prNumber, eipNumber, headers);

    const frontmatter = parseFrontmatter(content);
    if (!frontmatter) {
      throw new Error(
        `Could not parse frontmatter for EIP-${eipNumber} in PR #${prNumber}`,
      );
    }

    // Skip placeholder EIP numbers (TBD, XXXX, 9999, etc.)
    const eipField = frontmatter.eip;
    if (eipField && !/^\d+$/.test(String(eipField).trim())) {
      continue;
    }
    if (eipNumber === 9999) {
      continue;
    }

    const mapped = mapOfficialToLocal(frontmatter);

    // In auto-discovery mode, skip if requires doesn't reference any tracked EIP
    if (requiresFilter) {
      const requires = mapped.requires || [];
      const referencesTracked = requires.some((id) => trackedEipIds.has(id));
      if (!referencesTracked) continue;
    }

    candidates.push({ eipNumber, mapped });
    await sleep(200);
  }

  const actions = [];
  const processed = [];
  const pendingPr = pendingPullRequest(prNumber);

  for (const { eipNumber, mapped } of candidates) {
    const filePath = path.join(EIPS_DIR, `${eipNumber}.json`);

    if (fs.existsSync(filePath)) {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const existingPrNumber = getPendingPullRequestNumber(existing);

      if (!existingPrNumber) {
        console.log(
          `  EIP-${eipNumber}: already exists on master, skipping PR update`,
        );
        continue;
      }

      const { updated, changed } = updateExistingEip(eipNumber, existing, mapped, {
        pendingPullRequest: pendingPr,
      });
      if (changed) {
        actions.push({ type: 'update', eipNumber, filePath, eip: updated });
      }
    } else {
      const eipJson = buildNewEipJson(eipNumber, mapped, {
        pendingPullRequest: pendingPr,
      });
      actions.push({ type: 'create', eipNumber, filePath, eip: eipJson });
    }

    processed.push(eipNumber);
  }

  for (const action of actions) {
    fs.writeFileSync(action.filePath, JSON.stringify(action.eip, null, 2) + '\n');
    const verb = action.type === 'create' ? 'Created' : 'Updated';
    console.log(`  ${verb} EIP-${action.eipNumber} from PR #${prNumber}`);
  }

  return { eipNumbers: processed };
}

function removePendingEipFilesForPr(prNumber, eipNumbers, reason) {
  let removed = 0;

  for (const eipNumber of eipNumbers) {
    const filePath = path.join(EIPS_DIR, `${eipNumber}.json`);
    if (!fs.existsSync(filePath)) continue;

    const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (getPendingPullRequestNumber(existing) !== Number(prNumber)) {
      console.log(
        `  Preserving EIP-${eipNumber}; it is no longer pending on PR #${prNumber}`,
      );
      continue;
    }

    fs.unlinkSync(filePath);
    removed++;
    console.log(`  Removed EIP-${eipNumber} from PR #${prNumber} (${reason})`);
  }

  return removed;
}

function removePendingEipsForPr(manifest, prNumber, reason) {
  const entry = manifest.prs[prNumber];
  if (!entry) return 0;

  const removed = removePendingEipFilesForPr(
    prNumber,
    entry.eipNumbers,
    reason,
  );
  delete manifest.prs[prNumber];
  return removed;
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Fetch EIP PRs
=============

Discovers EIPs in open PRs that depend on tracked EIPs.

Usage:
  node scripts/fetch-eip-prs.mjs [options]

Options:
  --pr=NUMBER  Fetch EIPs from a single PR (skips requires filter)
  -h, --help   Show this help message

Environment:
  GITHUB_TOKEN  GitHub personal access token (recommended for higher rate limits)
`);
    process.exit(0);
  }

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    ...getAuthHeaders(),
  };

  // Single PR mode: skip requires filter, skip manifest
  if (options.singlePr) {
    console.log(`Fetching EIPs from PR #${options.singlePr}...`);
    const result = await processPr(options.singlePr, headers, null, false);
    if (result.eipNumbers.length === 0) {
      console.log('No new EIP files found in this PR.');
    }
    console.log('\nDone! Run "npm run compile-eips" to rebuild the EIP data.');
    return;
  }

  // Auto-discovery mode
  const trackedEipIds = getTrackedEipIds();
  console.log(`Loaded ${trackedEipIds.size} tracked EIP IDs.`);

  const manifest = loadPrManifest();
  console.log(
    `Last run: ${manifest.lastRun || 'never'}`,
  );

  // Capture the watermark before fetching so PRs updated during the run
  // are not skipped on the next run.
  const syncStartedAt = new Date().toISOString();

  console.log('Fetching open PRs from ethereum/EIPs...');
  const openPrs = await fetchOpenPrs(headers, manifest.lastRun);
  console.log(`Found ${openPrs.length} PRs to check.`);

  const updatedOpenPrNumbers = new Set(openPrs.map((pr) => pr.number));
  let created = 0;
  let removed = 0;
  let processingErrors = 0;

  // Process PRs in batches
  for (let i = 0; i < openPrs.length; i += BATCH_SIZE) {
    const batch = openPrs.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (pr) => {
        try {
          const result = await processPr(
            pr.number,
            headers,
            trackedEipIds,
            true,
          );
          return {
            prNumber: pr.number,
            updatedAt: pr.updatedAt,
            eipNumbers: result.eipNumbers,
          };
        } catch (err) {
          console.error(`  Error processing PR #${pr.number}: ${err.message}`);
          processingErrors++;
          return {
            prNumber: pr.number,
            updatedAt: pr.updatedAt,
            eipNumbers: [],
            error: true,
          };
        }
      }),
    );

    for (const r of results) {
      if (r.error) continue;

      if (r.eipNumbers.length > 0) {
        const previousEntry = manifest.prs[r.prNumber];
        if (previousEntry) {
          const currentEipNumbers = new Set(r.eipNumbers);
          const staleEipNumbers = (previousEntry.eipNumbers ?? []).filter(
            (eipNumber) => !currentEipNumbers.has(eipNumber),
          );
          removed += removePendingEipFilesForPr(
            r.prNumber,
            staleEipNumbers,
            'no longer qualifies',
          );
        }
        manifest.prs[r.prNumber] = {
          updatedAt: r.updatedAt,
          eipNumbers: r.eipNumbers,
        };
        created += r.eipNumbers.length;
      } else {
        removed += removePendingEipsForPr(
          manifest,
          r.prNumber,
          'no longer references tracked EIPs',
        );
      }
    }

    process.stdout.write(
      `\rProcessed ${Math.min(i + BATCH_SIZE, openPrs.length)}/${openPrs.length} PRs...`,
    );

    if (i + BATCH_SIZE < openPrs.length) {
      await sleep(BATCH_DELAY);
    }
  }

  if (processingErrors > 0) {
    throw new Error(
      `Failed to process ${processingErrors} PR(s); refusing to update ${path.basename(PR_MANIFEST_PATH)}.`,
    );
  }

  // Reconcile manifest entries that may have closed since the last run.
  for (const prNumber of Object.keys(manifest.prs)) {
    const numericPrNumber = Number(prNumber);
    if (updatedOpenPrNumbers.has(numericPrNumber)) continue;

    try {
      const state = await fetchPrState(numericPrNumber, headers);
      if (state.state !== 'open') {
        removed += removePendingEipsForPr(
          manifest,
          numericPrNumber,
          `PR is ${state.state}`,
        );
      }
    } catch (err) {
      console.warn(`\nWarning: ${err.message}`);
    }

    await sleep(BATCH_DELAY);
  }

  // Save manifest — use the pre-fetch watermark so PRs updated during
  // processing are re-checked on the next run.
  manifest.lastRun = syncStartedAt;
  fs.writeFileSync(PR_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  console.log('\n');
  console.log('Done!');
  if (created > 0) console.log(`  EIPs created/updated from PRs: ${created}`);
  if (removed > 0) console.log(`  Stale PR EIPs removed: ${removed}`);
  if (created === 0 && removed === 0) console.log('  No new EIPs found in open PRs.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
