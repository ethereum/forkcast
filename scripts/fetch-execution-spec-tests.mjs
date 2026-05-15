#!/usr/bin/env node
/**
 * Fetch per-EIP test counts from ethereum/execution-specs.
 *
 * Tests live on EIP feature branches (eips/amsterdam/eip-XXXX) and shared
 * devnet branches (devnets/bal/7, forks/amsterdam). This script checks all
 * sources and keeps the highest count per EIP.
 *
 * Usage: node scripts/fetch-execution-spec-tests.mjs
 * Env:   GITHUB_TOKEN (optional, for higher rate limits)
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_PATH = join(ROOT, 'src/data/execution-spec-test-counts.json');

const REPO = 'ethereum/execution-specs';
const FORK_NAME = 'amsterdam';
const API_BASE = `https://api.github.com/repos/${REPO}`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}`;

// Shared branches to check for merged tests (most recent first)
const SHARED_BRANCHES = ['devnets/bal/7', 'forks/amsterdam'];

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'forkcast-test-counter',
};
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function apiFetch(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`GitHub API ${res.status}: ${url}`);
  }
  return res.json();
}

async function rawFetch(branch, path) {
  const url = `${RAW_BASE}/${encodeURIComponent(branch)}/${path}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

/**
 * List EIP feature branches matching eips/<forkName>/eip-*.
 */
async function listFeatureBranches() {
  const branches = [];
  let page = 1;
  while (true) {
    const data = await apiFetch(
      `${API_BASE}/branches?per_page=100&page=${page}`,
    );
    if (!data || data.length === 0) break;
    for (const b of data) {
      if (b.name.startsWith(`eips/${FORK_NAME}/eip-`)) {
        branches.push(b.name);
      }
    }
    if (data.length < 100) break;
    page++;
  }
  return branches;
}

/**
 * Given a branch, find test directories and files under tests/<forkName>/.
 * Returns a map of eipNumber -> { directoryName, testFiles: string[] }.
 */
async function findTestFiles(branch) {
  // Get the tree SHA for the branch
  const refData = await apiFetch(
    `${API_BASE}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  if (!refData || !refData.tree) return new Map();

  const eipMap = new Map();
  const prefix = `tests/${FORK_NAME}/`;

  for (const entry of refData.tree) {
    if (!entry.path.startsWith(prefix)) continue;

    const relPath = entry.path.slice(prefix.length);
    const match = relPath.match(/^(eip(\d+)_[^/]+)\/test_[^/]+\.py$/);
    if (!match) continue;

    const [, directoryName, eipStr] = match;
    const eipNumber = parseInt(eipStr, 10);

    if (!eipMap.has(eipNumber)) {
      eipMap.set(eipNumber, { directoryName, testFiles: [] });
    }
    eipMap.get(eipNumber).testFiles.push(entry.path);
  }

  return eipMap;
}

/**
 * Count `def test_` occurrences in a list of files on a branch.
 */
async function countTestFunctions(branch, filePaths) {
  let total = 0;
  const batchSize = 5;

  for (let i = 0; i < filePaths.length; i += batchSize) {
    const batch = filePaths.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (path) => {
        const content = await rawFetch(branch, path);
        if (!content) return 0;
        return (content.match(/^def test_/gm) || []).length;
      }),
    );
    total += results.reduce((a, b) => a + b, 0);
  }

  return total;
}

async function main() {
  console.log(`Fetching test counts from ${REPO} for fork "${FORK_NAME}"...`);

  // Best result per EIP: { testFiles, testFunctions, branch, directoryName }
  const best = new Map();

  function updateBest(eipNumber, data) {
    const existing = best.get(eipNumber);
    if (!existing || data.testFunctions > existing.testFunctions) {
      best.set(eipNumber, data);
    }
  }

  // 1. Check EIP feature branches
  const featureBranches = await listFeatureBranches();
  console.log(`Found ${featureBranches.length} feature branches`);

  for (const branch of featureBranches) {
    const eipMatch = branch.match(/eip-(\d+)$/);
    if (!eipMatch) continue;
    const targetEip = parseInt(eipMatch[1], 10);

    console.log(`  Checking ${branch}...`);
    const eipMap = await findTestFiles(branch);

    // Only look at the EIP matching this branch
    const entry = eipMap.get(targetEip);
    if (!entry) {
      console.log(`    No tests found for EIP-${targetEip}`);
      continue;
    }

    const testFunctions = await countTestFunctions(branch, entry.testFiles);
    console.log(
      `    EIP-${targetEip}: ${entry.testFiles.length} files, ${testFunctions} functions`,
    );
    updateBest(targetEip, {
      testFiles: entry.testFiles.length,
      testFunctions,
      branch,
      directoryName: entry.directoryName,
    });
  }

  // 2. Check shared branches for any additional/updated EIPs
  for (const branch of SHARED_BRANCHES) {
    console.log(`  Checking shared branch ${branch}...`);
    const eipMap = await findTestFiles(branch);

    for (const [eipNumber, entry] of eipMap) {
      const testFunctions = await countTestFunctions(branch, entry.testFiles);
      console.log(
        `    EIP-${eipNumber}: ${entry.testFiles.length} files, ${testFunctions} functions`,
      );
      updateBest(eipNumber, {
        testFiles: entry.testFiles.length,
        testFunctions,
        branch,
        directoryName: entry.directoryName,
      });
    }
  }

  // Build output
  const eips = {};
  for (const [eipNumber, data] of [...best.entries()].sort(
    ([a], [b]) => a - b,
  )) {
    eips[String(eipNumber)] = data;
  }

  const output = {
    repo: REPO,
    fetchedAt: new Date().toISOString(),
    eips,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`Total: ${Object.keys(eips).length} EIPs with tests`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
