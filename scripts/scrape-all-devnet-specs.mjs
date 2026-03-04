#!/usr/bin/env node
/**
 * Re-scrape all known devnet specs from HackMD.
 * Reads existing JSON files in src/data/devnets/ to determine which IDs to scrape.
 * Tolerates 404s (not all devnets have HackMD specs).
 */

import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEVNETS_DIR = join(__dirname, '..', 'src/data/devnets');
const SCRAPER = join(__dirname, 'scrape-devnet-spec.mjs');

const files = readdirSync(DEVNETS_DIR).filter((f) => f.endsWith('.json'));
const ids = files.map((f) => f.replace('.json', ''));

console.log(`Scraping ${ids.length} devnet specs...\n`);

let succeeded = 0;
let failed = 0;

for (const id of ids) {
  try {
    execFileSync('node', [SCRAPER, id], { stdio: 'inherit' });
    succeeded++;
  } catch {
    console.warn(`  ⚠ Skipped ${id} (no HackMD spec found)\n`);
    failed++;
  }
}

console.log(`\nDone: ${succeeded} updated, ${failed} skipped`);
