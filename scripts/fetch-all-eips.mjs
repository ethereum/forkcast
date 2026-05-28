import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { parseFrontmatter, mapOfficialToLocal } from './lib/eip-parsing.mjs';
import {
  buildNewEipJson,
  EXCLUDED_STATUSES,
  updateExistingEip,
} from './eip-record-sync.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EIPS_DIR = path.join(__dirname, '../src/data/eips');
const EIPS_MD_DIR = path.join(__dirname, '../public/eips');
const MANIFEST_PATH = path.join(EIPS_MD_DIR, 'manifest.json');
const BATCH_SIZE = 5;
const BATCH_DELAY = 200;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    help: args.includes('--help') || args.includes('-h'),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function extractMarkdownBody(content) {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

async function fetchEipTree() {
  const url =
    'https://api.github.com/repos/ethereum/EIPs/git/trees/master?recursive=1';
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch tree: HTTP ${response.status}`);
  }
  const data = await response.json();

  return data.tree
    .filter((item) => /^EIPS\/eip-\d+\.md$/.test(item.path))
    .map((item) => {
      const match = item.path.match(/eip-(\d+)\.md$/);
      return parseInt(match[1], 10);
    });
}

async function fetchEipContent(eipNumber) {
  const url = `https://raw.githubusercontent.com/ethereum/EIPs/refs/heads/master/EIPS/eip-${eipNumber}.md`;
  const response = await fetch(url);
  if (!response.ok) {
    return { error: `HTTP ${response.status}` };
  }
  return { content: await response.text() };
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Fetch All EIPs
==============

Syncs EIP data from the ethereum/EIPs GitHub repository.

For each EIP on master:
  - New EIPs: creates JSON metadata and markdown spec
  - Existing EIPs: updates official metadata fields (title, description,
    author, status, etc.) while preserving local fields (forkRelationships,
    laymanDescription, benefits, etc.)
  - Markdown specs: always refreshed (only written to disk when changed)

Usage:
  npm run fetch-eips [options]

Options:
  -h, --help  Show this help message
`);
    process.exit(0);
  }

  // Ensure output directories exist
  if (!fs.existsSync(EIPS_MD_DIR)) {
    fs.mkdirSync(EIPS_MD_DIR, { recursive: true });
  }

  console.log('Fetching EIP tree from GitHub...');
  const allEipNumbers = await fetchEipTree();
  console.log(`Found ${allEipNumbers.length} EIPs in ethereum/EIPs repo.`);

  // Load existing manifest for change detection
  const manifest = loadManifest();
  const specChanges = [];

  // All EIPs are fetched — new ones get full JSON, existing ones get metadata updates
  const toFetch = [...allEipNumbers].sort((a, b) => a - b);

  let created = 0;
  let metadataUpdated = 0;
  let mdSaved = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (eipNumber) => {
        const result = await fetchEipContent(eipNumber);
        if (result.error) {
          console.error(`  Error fetching EIP-${eipNumber}: ${result.error}`);
          return { eipNumber, error: true };
        }

        const frontmatter = parseFrontmatter(result.content);
        if (!frontmatter) {
          console.error(`  Error parsing frontmatter for EIP-${eipNumber}`);
          return { eipNumber, error: true };
        }

        const mapped = mapOfficialToLocal(frontmatter);

        // Skip excluded statuses (e.g., Moved)
        if (EXCLUDED_STATUSES.has(mapped.status)) {
          return { eipNumber, skipped: true };
        }

        // Update or create JSON metadata
        const filePath = path.join(EIPS_DIR, `${eipNumber}.json`);
        const isNew = !fs.existsSync(filePath);
        let jsonChanged = false;

        if (isNew) {
          const eipJson = buildNewEipJson(eipNumber, mapped);
          fs.writeFileSync(filePath, JSON.stringify(eipJson, null, 2) + '\n');
          jsonChanged = true;
        } else {
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const { updated, changed } = updateExistingEip(eipNumber, existing, mapped, {
            clearPendingPullRequest: true,
          });
          if (changed) {
            fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
            jsonChanged = true;
          }
        }

        // Save markdown spec (only write when content hash changes)
        let savedMd = false;
        const body = extractMarkdownBody(result.content);
        if (body) {
          const newHash = hashContent(body);
          const prev = manifest[eipNumber];
          const mdChanged = !prev || prev.hash !== newHash;

          if (mdChanged) {
            const mdPath = path.join(EIPS_MD_DIR, `${eipNumber}.md`);
            fs.writeFileSync(mdPath, body);
            savedMd = true;

            if (prev) {
              specChanges.push({ id: eipNumber, lastFetched: prev.fetchedAt });
            }
            manifest[eipNumber] = {
              hash: newHash,
              fetchedAt: new Date().toISOString(),
            };
          }
        }

        return { eipNumber, isNew, jsonChanged, savedMd };
      }),
    );

    for (const r of results) {
      if (r.error) {
        errors++;
      } else if (!r.skipped) {
        if (r.isNew) created++;
        else if (r.jsonChanged) metadataUpdated++;
        if (r.savedMd) mdSaved++;
      }
    }

    process.stdout.write(
      `\rProcessed ${Math.min(i + BATCH_SIZE, toFetch.length)}/${toFetch.length}...`,
    );

    if (i + BATCH_SIZE < toFetch.length) {
      await sleep(BATCH_DELAY);
    }
  }

  // Write manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  console.log('\n');
  console.log('Done!');
  if (created > 0) console.log(`  New EIPs: ${created}`);
  if (metadataUpdated > 0) console.log(`  Metadata updated: ${metadataUpdated}`);
  console.log(`  Markdown specs saved: ${mdSaved}`);
  if (errors > 0) console.log(`  Errors: ${errors}`);

  if (specChanges.length > 0) {
    console.log(`\nSpec changes detected (${specChanges.length}):`);
    for (const change of specChanges) {
      console.log(
        `  EIP-${change.id} spec changed (last fetched: ${change.lastFetched})`,
      );
    }
  }

  console.log('\nRun "npm run compile-eips" to rebuild the EIP data.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
