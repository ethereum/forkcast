#!/usr/bin/env node
/**
 * Re-scrape all known devnet specs from HackMD.
 * Reads existing JSON files in src/data/devnets/ to determine which IDs to scrape,
 * then probes for new devnets beyond the highest known number in each series.
 * Tolerates 404s (not all devnets have HackMD specs).
 */

import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEVNETS_DIR = join(__dirname, '..', 'src/data/devnets');
const SCRAPER = join(__dirname, 'scrape-devnet-spec.mjs');

function scrape(id, { quiet = false } = {}) {
  execFileSync('node', [SCRAPER, id], {
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
}

const files = readdirSync(DEVNETS_DIR).filter((f) => f.endsWith('.json'));
const ids = new Set(files.map((f) => f.replace('.json', '')));

// Group by series prefix and find the max version in each.
// e.g. "glamsterdam-devnet-3" → series "glamsterdam-devnet", version 3
const seriesMax = new Map();
for (const id of ids) {
  const match = id.match(/^(.+-devnet)-(\d+)$/);
  if (!match) continue;
  const [, series, numStr] = match;
  const num = parseInt(numStr, 10);
  if (!seriesMax.has(series) || num > seriesMax.get(series)) {
    seriesMax.set(series, num);
  }
}

// --- Phase 1: scrape all known IDs ---
console.log(`Scraping ${ids.size} known devnet specs...\n`);

let succeeded = 0;
let failed = 0;

for (const id of ids) {
  try {
    scrape(id);
    succeeded++;
  } catch {
    console.warn(`  ⚠ Skipped ${id} (no HackMD spec found)\n`);
    failed++;
  }
}

// --- Phase 2: probe for new devnets beyond the highest known version ---
let discovered = 0;

for (const [series, max] of seriesMax) {
  let next = max + 1;
  while (true) {
    const candidate = `${series}-${next}`;
    console.log(`Probing for ${candidate}...`);
    try {
      scrape(candidate, { quiet: true });
      console.log(`  ✓ Discovered ${candidate}`);
      discovered++;
      next++;
    } catch {
      console.log(`  — not found, stopping ${series} series`);
      break;
    }
  }
}

console.log(
  `\nDone: ${succeeded} updated, ${failed} skipped, ${discovered} newly discovered`,
);
