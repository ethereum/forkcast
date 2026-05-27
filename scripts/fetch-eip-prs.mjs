import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFrontmatter, mapOfficialToLocal } from './lib/eip-parsing.mjs';

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
    return JSON.parse(fs.readFileSync(PR_MANIFEST_PATH, 'utf8'));
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

/**
 * Fetch file list for a PR and return added EIP filenames.
 */
async function fetchPrEipFiles(prNumber, headers) {
  const url = `https://api.github.com/repos/ethereum/EIPs/pulls/${prNumber}/files?per_page=100`;
  const response = await fetch(url, { headers });
  if (!response.ok) return [];

  const files = await response.json();
  return files
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
  if (!response.ok) return null;
  return await response.text();
}

/**
 * Build a new EIP JSON object for an EIP from a PR.
 */
function buildNewEipJson(eipNumber, mapped, prNumber) {
  return {
    id: eipNumber,
    title: `EIP-${eipNumber}: ${mapped.title || ''}`,
    status: mapped.status || 'Unknown',
    description: mapped.description || '',
    author: mapped.author || '',
    type: mapped.type || 'Standards Track',
    ...(mapped.category && { category: mapped.category }),
    createdDate: mapped.createdDate || '',
    ...(mapped.discussionLink && { discussionLink: mapped.discussionLink }),
    ...(mapped.requires?.length && { requires: mapped.requires }),
    specificationUrl: `https://github.com/ethereum/EIPs/pull/${prNumber}`,
    forkRelationships: [],
    tradeoffs: null,
  };
}

/**
 * Process a single PR: fetch its EIP files, parse, and create/update JSON.
 */
async function processPr(prNumber, headers, trackedEipIds, requiresFilter) {
  const eipNumbers = await fetchPrEipFiles(prNumber, headers);
  if (eipNumbers.length === 0) return [];

  const processed = [];

  for (const eipNumber of eipNumbers) {
    const content = await fetchEipFromPrBranch(prNumber, eipNumber, headers);
    if (!content) continue;

    const frontmatter = parseFrontmatter(content);
    if (!frontmatter) continue;

    // Skip non-numeric EIP numbers (TBD, XXXX, etc.)
    const eipField = frontmatter.eip;
    if (eipField && !/^\d+$/.test(String(eipField).trim())) {
      continue;
    }

    const mapped = mapOfficialToLocal(frontmatter);

    // In auto-discovery mode, skip if requires doesn't reference any tracked EIP
    if (requiresFilter) {
      const requires = mapped.requires || [];
      const referencesTracked = requires.some((id) => trackedEipIds.has(id));
      if (!referencesTracked) continue;
    }

    // Create or update the EIP JSON
    const filePath = path.join(EIPS_DIR, `${eipNumber}.json`);
    const prUrl = `https://github.com/ethereum/EIPs/pull/${prNumber}`;

    if (fs.existsSync(filePath)) {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      // Only update if it doesn't already exist on master (no specificationUrl means it's merged)
      if (!existing.specificationUrl) {
        console.log(
          `  EIP-${eipNumber}: already exists on master, skipping PR update`,
        );
        continue;
      }
      // Update specificationUrl and metadata
      existing.specificationUrl = prUrl;
      if (mapped.title)
        existing.title = `EIP-${eipNumber}: ${mapped.title}`;
      if (mapped.status) existing.status = mapped.status;
      if (mapped.description) existing.description = mapped.description;
      if (mapped.author) existing.author = mapped.author;
      if (mapped.requires?.length) existing.requires = mapped.requires;
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + '\n');
      console.log(`  Updated EIP-${eipNumber} from PR #${prNumber}`);
    } else {
      const eipJson = buildNewEipJson(eipNumber, mapped, prNumber);
      fs.writeFileSync(filePath, JSON.stringify(eipJson, null, 2) + '\n');
      console.log(`  Created EIP-${eipNumber} from PR #${prNumber}`);
    }

    processed.push(eipNumber);
    await sleep(200);
  }

  return processed;
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
    const eipNumbers = await processPr(
      options.singlePr,
      headers,
      null,
      false,
    );
    if (eipNumbers.length === 0) {
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

  console.log('Fetching open PRs from ethereum/EIPs...');
  const openPrs = await fetchOpenPrs(headers, manifest.lastRun);
  console.log(`Found ${openPrs.length} PRs to check.`);

  const openPrNumbers = new Set(openPrs.map((pr) => pr.number));
  let created = 0;

  // Process PRs in batches
  for (let i = 0; i < openPrs.length; i += BATCH_SIZE) {
    const batch = openPrs.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (pr) => {
        try {
          const eipNumbers = await processPr(
            pr.number,
            headers,
            trackedEipIds,
            true,
          );
          return { prNumber: pr.number, updatedAt: pr.updatedAt, eipNumbers };
        } catch (err) {
          console.error(`  Error processing PR #${pr.number}: ${err.message}`);
          return { prNumber: pr.number, updatedAt: pr.updatedAt, eipNumbers: [] };
        }
      }),
    );

    for (const r of results) {
      if (r.eipNumbers.length > 0) {
        manifest.prs[r.prNumber] = {
          updatedAt: r.updatedAt,
          eipNumbers: r.eipNumbers,
        };
        created += r.eipNumbers.length;
      }
    }

    process.stdout.write(
      `\rProcessed ${Math.min(i + BATCH_SIZE, openPrs.length)}/${openPrs.length} PRs...`,
    );

    if (i + BATCH_SIZE < openPrs.length) {
      await sleep(BATCH_DELAY);
    }
  }

  // Cleanup: warn about PRs in manifest that are no longer open
  for (const prNumber of Object.keys(manifest.prs)) {
    if (!openPrNumbers.has(parseInt(prNumber, 10))) {
      const entry = manifest.prs[prNumber];
      console.warn(
        `\nWarning: PR #${prNumber} (EIPs: ${entry.eipNumbers.join(', ')}) is no longer in the open PR list. It may have been merged or closed.`,
      );
    }
  }

  // Save manifest
  manifest.lastRun = new Date().toISOString();
  fs.writeFileSync(PR_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  console.log('\n');
  console.log('Done!');
  if (created > 0) console.log(`  EIPs created/updated from PRs: ${created}`);
  else console.log('  No new EIPs found in open PRs.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
