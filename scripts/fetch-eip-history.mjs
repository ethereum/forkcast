import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EIPS_DIR = path.join(__dirname, '../src/data/eips');
const EIPS_MD_DIR = path.join(__dirname, '../public/eips');
const HISTORY_DIR = path.join(EIPS_MD_DIR, 'history');
const MANIFEST_PATH = path.join(HISTORY_DIR, 'manifest.json');
const BATCH_SIZE = 3;
const BATCH_DELAY = 500;
const MAX_PATCH_SIZE = 5000; // bytes — patches larger than this are dropped

// Only fetch history for EIPs that are actively under consideration for these forks
const TARGET_FORKS = new Set(['Glamsterdam', 'Hegota']);
const ACTIVE_STATUSES = new Set(['Proposed', 'Considered', 'Scheduled']);

function parseArgs() {
  const args = process.argv.slice(2);
  const eipArg = args.find((a) => a.startsWith('--eip='));
  return {
    help: args.includes('--help') || args.includes('-h'),
    singleEip: eipArg ? parseInt(eipArg.split('=')[1], 10) : null,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function loadExistingHistory(eipNumber) {
  const filePath = path.join(HISTORY_DIR, `${eipNumber}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
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

function parsePrNumber(message) {
  const match = message.match(/\(#(\d+)\)/);
  return match ? parseInt(match[1], 10) : null;
}

function truncateMessage(message) {
  const firstLine = message.split('\n')[0];
  return firstLine.length > 200 ? firstLine.slice(0, 200) + '...' : firstLine;
}

/**
 * Get EIP IDs that are PFI, CFI, or SFI in Glamsterdam or Hegota.
 */
function getActiveEipIds() {
  const ids = new Set();
  const files = fs
    .readdirSync(EIPS_DIR)
    .filter((f) => /^\d+\.json$/.test(f));

  for (const file of files) {
    const eip = JSON.parse(fs.readFileSync(path.join(EIPS_DIR, file), 'utf8'));
    for (const rel of eip.forkRelationships || []) {
      if (!TARGET_FORKS.has(rel.forkName)) continue;
      const latest = rel.statusHistory?.[rel.statusHistory.length - 1];
      if (latest && ACTIVE_STATUSES.has(latest.status)) {
        ids.add(eip.id);
      }
    }
  }

  return [...ids].sort((a, b) => a - b);
}

/**
 * Parse the Link header from GitHub API responses for pagination.
 */
function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch the patch for a specific file from a single commit.
 * Returns the unified diff string (capped at MAX_PATCH_SIZE), or null.
 */
async function fetchPatchForCommit(sha, eipNumber, headers) {
  const url = `https://api.github.com/repos/ethereum/EIPs/commits/${sha}`;
  const response = await fetch(url, { headers });
  if (!response.ok) return null;

  const data = await response.json();
  const eipFile = (data.files || []).find(
    (f) =>
      f.filename === `EIPS/eip-${eipNumber}.md` ||
      f.previous_filename === `EIPS/eip-${eipNumber}.md`,
  );
  if (!eipFile) return null;

  const additions = eipFile.additions || 0;
  const deletions = eipFile.deletions || 0;
  const patch = eipFile.patch || null;

  if (patch && patch.length > MAX_PATCH_SIZE) {
    return { patch: null, additions, deletions };
  }
  return { patch, additions, deletions };
}

/**
 * Fetch all commits for a given EIP file, following pagination.
 */
async function fetchCommitsForEip(eipNumber, headers, since) {
  const params = new URLSearchParams({
    path: `EIPS/eip-${eipNumber}.md`,
    per_page: '100',
  });
  if (since) {
    const sinceDate = new Date(new Date(since).getTime() + 1000);
    params.set('since', sinceDate.toISOString());
  }

  let url = `https://api.github.com/repos/ethereum/EIPs/commits?${params}`;
  const allCommits = [];

  while (url) {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      if (response.status === 409) return [];
      throw new Error(`HTTP ${response.status} for EIP-${eipNumber}`);
    }

    const data = await response.json();
    for (const item of data) {
      allCommits.push({
        sha: item.sha,
        date: item.commit.author.date,
        message: truncateMessage(item.commit.message),
        author: item.author?.login || item.commit.author.name || 'unknown',
        prNumber: parsePrNumber(item.commit.message),
      });
    }

    url = parseNextLink(response.headers.get('link'));
  }

  return allCommits;
}

/**
 * Fetch all open PRs that modify tracked EIP spec files in a single pass.
 * Returns a Map<eipNumber, openPr[]>. Throws on search API failure so that
 * callers preserve stale data instead of overwriting with empty results.
 */
async function fetchAllOpenEipPrs(eipNumbers, headers) {
  const eipSet = new Set(eipNumbers);
  const prsByEip = new Map();

  // Paginated search for all open "Update EIP-" PRs
  const query = `repo:ethereum/EIPs is:pr is:open "Update EIP-" in:title`;
  let url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100`;

  const allItems = [];
  while (url) {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Search API returned ${response.status} fetching open EIP PRs`);
    }
    const data = await response.json();
    allItems.push(...(data.items || []));
    url = parseNextLink(response.headers.get('link'));
    if (url) await sleep(2000); // Search API: 30 req/min
  }

  // For each PR, fetch its paginated file list and group by EIP
  for (const item of allItems) {
    const files = [];
    let page = 1;
    while (true) {
      const filesUrl = `https://api.github.com/repos/ethereum/EIPs/pulls/${item.number}/files?per_page=100&page=${page}`;
      const filesResp = await fetch(filesUrl, { headers });
      if (!filesResp.ok) {
        throw new Error(
          `Failed to fetch files for PR #${item.number}: HTTP ${filesResp.status}`,
        );
      }
      const pageFiles = await filesResp.json();
      files.push(...pageFiles);
      if (pageFiles.length < 100) break;
      page++;
      await sleep(100);
    }
    for (const f of files) {
      if (f.status !== 'modified') continue;
      const match = f.filename.match(/^EIPS\/eip-(\d+)\.md$/);
      if (!match) continue;
      const eipId = parseInt(match[1], 10);
      if (!eipSet.has(eipId)) continue;

      if (!prsByEip.has(eipId)) prsByEip.set(eipId, []);
      prsByEip.get(eipId).push({
        number: item.number,
        title: item.title,
        author: item.user?.login || 'unknown',
        updatedAt: item.updated_at,
        additions: f.additions || 0,
        deletions: f.deletions || 0,
      });
    }

    await sleep(100);
  }

  return prsByEip;
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Fetch EIP Spec History
======================

Fetches commit history for EIP spec files from the ethereum/EIPs GitHub repo.
Only fetches for EIPs that are PFI, CFI, or SFI in Glamsterdam or Hegota.

Usage:
  node scripts/fetch-eip-history.mjs [options]

Options:
  --eip=NUMBER  Fetch history for a single EIP (bypasses fork filter)
  -h, --help    Show this help message

Environment:
  GITHUB_TOKEN  GitHub personal access token (recommended for higher rate limits)
`);
    process.exit(0);
  }

  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    ...getAuthHeaders(),
  };

  const manifest = loadManifest();

  let eipNumbers;
  if (options.singleEip) {
    eipNumbers = [options.singleEip];
    console.log(`Fetching history for EIP-${options.singleEip}...`);
  } else {
    eipNumbers = getActiveEipIds();
    console.log(
      `Fetching history for ${eipNumbers.length} active EIPs (PFI/CFI/SFI in ${[...TARGET_FORKS].join('/')})...`,
    );
  }

  // Fetch all open EIP PRs upfront (single search pass)
  let openPrsByEip = new Map();
  let openPrFetchFailed = false;
  try {
    console.log('Fetching open EIP PRs...');
    openPrsByEip = await fetchAllOpenEipPrs(eipNumbers, headers);
    console.log(`Found open PRs for ${openPrsByEip.size} EIPs.`);
  } catch (err) {
    console.error(`  Error fetching open PRs: ${err.message}`);
    console.error('  Open PR data will be preserved as-is (not overwritten).');
    openPrFetchFailed = true;
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < eipNumbers.length; i += BATCH_SIZE) {
    const batch = eipNumbers.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (eipNumber) => {
        try {
          const entry = manifest[eipNumber];
          const historyFileExists = fs.existsSync(path.join(HISTORY_DIR, `${eipNumber}.json`));
          const since = entry && historyFileExists ? entry.lastCommitDate : null;

          const newCommits = await fetchCommitsForEip(
            eipNumber,
            headers,
            since,
          );

          if (newCommits.length === 0 && entry && historyFileExists) {
            // No new commits — only update the file if open PR data changed
            const existing = loadExistingHistory(eipNumber);
            if (!openPrFetchFailed) {
              const openPrs = openPrsByEip.get(eipNumber) || [];
              const hadOpenPrs = (existing?.openPrs || []).length > 0;
              if (openPrs.length > 0 || hadOpenPrs) {
                const history = { ...existing, openPrs: openPrs.length > 0 ? openPrs : undefined };
                if (!history.openPrs) delete history.openPrs;
                const filePath = path.join(HISTORY_DIR, `${eipNumber}.json`);
                fs.writeFileSync(filePath, JSON.stringify(history, null, 2) + '\n');
              }
            }
            return { eipNumber, skipped: true };
          }

          const existing = loadExistingHistory(eipNumber);
          const existingShas = new Set(
            (existing?.commits || []).map((c) => c.sha),
          );
          const dedupedNew = newCommits.filter(
            (c) => !existingShas.has(c.sha),
          );

          // Fetch patches for new commits
          for (const commit of dedupedNew) {
            const result = await fetchPatchForCommit(
              commit.sha,
              eipNumber,
              headers,
            );
            if (result) {
              if (result.patch) commit.patch = result.patch;
              commit.additions = result.additions;
              commit.deletions = result.deletions;
            }
            await sleep(100);
          }

          // Backfill patches for existing commits missing them
          const existingCommits = existing?.commits || [];
          const missingPatches = existingCommits.filter((c) => !c.patch && c.additions === undefined);
          for (const commit of missingPatches) {
            const result = await fetchPatchForCommit(
              commit.sha,
              eipNumber,
              headers,
            );
            if (result) {
              if (result.patch) commit.patch = result.patch;
              commit.additions = result.additions;
              commit.deletions = result.deletions;
            }
            await sleep(100);
          }

          const allCommits = [...dedupedNew, ...(existing?.commits || [])];
          allCommits.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );

          // Merge open PRs from the upfront fetch
          let openPrs;
          if (openPrFetchFailed) {
            // Preserve existing open PR data on failure
            openPrs = existing?.openPrs || [];
          } else {
            openPrs = openPrsByEip.get(eipNumber) || [];
          }

          const history = {
            eipId: eipNumber,
            commits: allCommits,
            ...(openPrs.length > 0 ? { openPrs } : {}),
          };

          const filePath = path.join(HISTORY_DIR, `${eipNumber}.json`);
          fs.writeFileSync(filePath, JSON.stringify(history, null, 2) + '\n');

          manifest[eipNumber] = {
            lastSha: allCommits[0]?.sha || null,
            lastCommitDate: allCommits[0]?.date || null,
            fetchedAt: new Date().toISOString(),
            commitCount: allCommits.length,
          };

          return { eipNumber, updated: true, newCount: dedupedNew.length };
        } catch (err) {
          console.error(`  Error fetching EIP-${eipNumber}: ${err.message}`);
          return { eipNumber, error: true };
        }
      }),
    );

    for (const r of results) {
      if (r.error) errors++;
      else if (r.skipped) skipped++;
      else if (r.updated) updated++;
    }

    if (!options.singleEip) {
      process.stdout.write(
        `\rProcessed ${Math.min(i + BATCH_SIZE, eipNumbers.length)}/${eipNumbers.length}...`,
      );
    }

    if (i + BATCH_SIZE < eipNumbers.length) {
      await sleep(BATCH_DELAY);
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  console.log('\n');
  console.log('Done!');
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (no new commits): ${skipped}`);
  if (errors > 0) console.log(`  Errors: ${errors}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
