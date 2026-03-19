import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { parseFrontmatter, mapOfficialToLocal } from './lib/eip-parsing.mjs';

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
    force: args.includes('--force'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getExistingEipIds() {
  return new Set(
    fs
      .readdirSync(EIPS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => parseInt(f.replace('.json', ''), 10))
      .filter((n) => !isNaN(n)),
  );
}

function isEipCurated(eipId) {
  const filePath = path.join(EIPS_DIR, `${eipId}.json`);
  if (!fs.existsSync(filePath)) return false;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data.curated === true;
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

// EIPs with status "Moved" (e.g., ERCs moved to their own repo) are excluded
const EXCLUDED_STATUSES = new Set(['Moved']);

function buildEipJson(eipNumber, official) {
  const mapped = mapOfficialToLocal(official);

  if (EXCLUDED_STATUSES.has(mapped.status)) {
    return null;
  }

  const eip = {
    id: eipNumber,
    title: `EIP-${eipNumber}: ${mapped.title || ''}`,
    status: mapped.status || 'Unknown',
    description: mapped.description || '',
    author: mapped.author || '',
    type: mapped.type || 'Standards Track',
    ...(mapped.category && { category: mapped.category }),
    createdDate: mapped.createdDate || '',
    ...(mapped.discussionLink && { discussionLink: mapped.discussionLink }),
    forkRelationships: [],
    tradeoffs: null,
    curated: false,
  };

  return eip;
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Fetch All EIPs
==============

Imports EIP metadata from the ethereum/EIPs GitHub repository.
Existing curated EIPs are never overwritten.
Markdown specs are saved for all EIPs (including curated).

Usage:
  npm run fetch-eips [options]

Options:
  --force   Refresh metadata for non-curated EIPs and all markdown specs
  -h, --help  Show this help message
`);
    process.exit(0);
  }

  // Ensure markdown output directory exists
  if (!fs.existsSync(EIPS_MD_DIR)) {
    fs.mkdirSync(EIPS_MD_DIR, { recursive: true });
  }

  console.log('Fetching EIP tree from GitHub...');
  const allEipNumbers = await fetchEipTree();
  console.log(`Found ${allEipNumbers.length} EIPs in ethereum/EIPs repo.`);

  const existingIds = getExistingEipIds();
  console.log(`${existingIds.size} EIPs already exist locally.`);

  // Load existing manifest for change detection
  const manifest = loadManifest();
  const specChanges = [];

  // Determine which EIPs to fetch for JSON metadata
  let toFetchJson;
  if (options.force) {
    // Fetch all non-curated EIPs (new + existing non-curated)
    toFetchJson = new Set(allEipNumbers.filter((id) => !isEipCurated(id)));
    console.log(
      `--force: will fetch/refresh ${toFetchJson.size} non-curated EIP metadata + all markdown specs.`,
    );
  } else {
    // Only fetch new EIPs for JSON
    toFetchJson = new Set(allEipNumbers.filter((id) => !existingIds.has(id)));
    console.log(`${toFetchJson.size} new EIPs to fetch.`);
  }

  // For markdown, fetch all EIPs (including curated) when --force,
  // otherwise only new ones
  const toFetchMd = options.force
    ? new Set(allEipNumbers)
    : new Set(allEipNumbers.filter((id) => !fs.existsSync(path.join(EIPS_MD_DIR, `${id}.md`))));

  // Union: fetch content for any EIP that needs JSON or markdown
  const toFetch = [...new Set([...toFetchJson, ...toFetchMd])].sort(
    (a, b) => a - b,
  );

  if (toFetch.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  let created = 0;
  let updated = 0;
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

        // Save JSON metadata (only for non-curated EIPs that need it)
        let isNew = false;
        let skipped = false;
        if (toFetchJson.has(eipNumber)) {
          const frontmatter = parseFrontmatter(result.content);
          if (!frontmatter) {
            console.error(
              `  Error parsing frontmatter for EIP-${eipNumber}`,
            );
            return { eipNumber, error: true };
          }

          const eipJson = buildEipJson(eipNumber, frontmatter);
          if (!eipJson) {
            // Excluded status (e.g., Moved) — skip JSON and markdown
            skipped = true;
          } else {
            const filePath = path.join(EIPS_DIR, `${eipNumber}.json`);
            isNew = !fs.existsSync(filePath);
            fs.writeFileSync(filePath, JSON.stringify(eipJson, null, 2) + '\n');
          }
        }

        // Save markdown spec (skip excluded EIPs)
        let savedMd = false;
        if (!skipped && toFetchMd.has(eipNumber)) {
          const body = extractMarkdownBody(result.content);
          if (body) {
            const mdPath = path.join(EIPS_MD_DIR, `${eipNumber}.md`);
            fs.writeFileSync(mdPath, body);
            savedMd = true;

            // Update manifest with change detection
            const newHash = hashContent(body);
            const prev = manifest[eipNumber];
            if (prev && prev.hash !== newHash) {
              specChanges.push({
                id: eipNumber,
                lastFetched: prev.fetchedAt,
              });
            }
            manifest[eipNumber] = {
              hash: newHash,
              fetchedAt: new Date().toISOString(),
            };
          }
        }

        return { eipNumber, isNew, savedMd, jsonUpdated: toFetchJson.has(eipNumber) };
      }),
    );

    for (const r of results) {
      if (r.error) {
        errors++;
      } else {
        if (r.jsonUpdated && r.isNew) created++;
        else if (r.jsonUpdated) updated++;
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
  if (created > 0) console.log(`  JSON created: ${created}`);
  if (updated > 0) console.log(`  JSON updated: ${updated}`);
  console.log(`  Markdown specs saved: ${mdSaved}`);
  if (errors > 0) console.log(`  Errors: ${errors}`);

  // Report spec changes
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
