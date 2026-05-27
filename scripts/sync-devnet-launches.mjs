#!/usr/bin/env node
/**
 * Generate devnet-launches.json from scraped devnet spec files.
 * Reads all {series}-devnet-*.json files and extracts launch dates
 * from the genesisTime field for devnets that have already launched.
 *
 * Usage: node scripts/sync-devnet-launches.mjs
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEVNETS_DIR = join(__dirname, '..', 'src/data/devnets');
const OUTPUT_DIR = join(__dirname, '..', 'src/data/generated');
const OUTPUT_PATH = join(OUTPUT_DIR, 'devnet-launches.json');

// Series to track — add new fork names here as they start devnets
const SERIES = ['glamsterdam', 'hegota'];

function formatDate(unixSeconds) {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDateISO(unixSeconds) {
  const d = new Date(unixSeconds * 1000);
  return d.toISOString().slice(0, 10);
}

const result = {};

for (const series of SERIES) {
  const prefix = `${series}-devnet-`;
  const files = readdirSync(DEVNETS_DIR).filter(
    (f) => f.startsWith(prefix) && f.endsWith('.json'),
  );

  const launches = [];
  for (const file of files) {
    const spec = JSON.parse(readFileSync(join(DEVNETS_DIR, file), 'utf-8'));
    if (!spec.genesisTime) continue;
    // Only include devnets that have already launched
    if (spec.genesisTime * 1000 > Date.now()) continue;

    const version = parseInt(file.replace(prefix, '').replace('.json', ''), 10);
    launches.push({ version, date: formatDate(spec.genesisTime), dateISO: formatDateISO(spec.genesisTime) });
  }

  launches.sort((a, b) => a.version - b.version);
  if (launches.length) {
    result[series] = launches;
  }
}

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2) + '\n');
console.log(`Wrote ${OUTPUT_PATH} (${Object.keys(result).length} series)`);
