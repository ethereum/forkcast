/**
 * Validates the hand-edited data that compile-eips' schema doesn't cover, and
 * the references between files (see lib/data-integrity.mjs). Runs first in
 * `compile-data`, so a typo fails the build instead of quietly dropping
 * something from a page.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { checkDataIntegrity } from './lib/data-integrity.mjs';
import { ALL_CLIENT_TEAMS } from '../src/constants/client-teams.ts';
import { breakouts } from '../src/data/breakouts.ts';
import { eipCategories } from '../src/data/eip-categories.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/data');
const ARTIFACTS_DIR = path.join(ROOT, 'public/artifacts');

// Not call series: per-call breakout folders registered in breakouts.ts.
const NON_SERIES_ARTIFACT_DIRS = new Set(['acdt-breakouts']);
// <date>_<number>, where ethproofs has suffixed numbers like 006b.
const CALL_DIR_RE = /^\d{4}-\d{2}-\d{2}_\d+[a-z]?$/;

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const jsonFiles = dir => fs.readdirSync(dir).filter(file => file.endsWith('.json')).sort();

function loadCallDirs() {
  const dirs = [];
  for (const type of fs.readdirSync(ARTIFACTS_DIR).sort()) {
    if (NON_SERIES_ARTIFACT_DIRS.has(type)) continue;
    const typeDir = path.join(ARTIFACTS_DIR, type);
    if (!fs.statSync(typeDir).isDirectory()) continue;
    for (const callId of fs.readdirSync(typeDir).sort()) {
      if (!CALL_DIR_RE.test(callId)) continue;
      const files = fs.readdirSync(path.join(typeDir, callId));
      dirs.push({
        dir: `${type}/${callId}`,
        config: files.includes('config.json') ? readJson(path.join(typeDir, callId, 'config.json')) : null,
        hasTranscript: files.some(file => file.endsWith('.vtt')),
      });
    }
  }
  return dirs;
}

const eipSchema = readJson(path.join(__dirname, 'eip-schema.json'));

const { errors, warnings } = checkDataIntegrity({
  eips: jsonFiles(path.join(DATA_DIR, 'eips')).map(file => ({ file, eip: readJson(path.join(DATA_DIR, 'eips', file)) })),
  forkNames: eipSchema.$defs.ForkRelationship.properties.forkName.enum.map(name => name.toLowerCase()),
  calls: readJson(path.join(DATA_DIR, 'protocol-calls.generated.json')),
  prioritization: jsonFiles(path.join(DATA_DIR, 'prioritization')).map(file => ({
    file,
    data: readJson(path.join(DATA_DIR, 'prioritization', file)),
  })),
  devnets: jsonFiles(path.join(DATA_DIR, 'devnets')).map(file => ({
    file,
    data: readJson(path.join(DATA_DIR, 'devnets', file)),
  })),
  callDirs: loadCallDirs(),
  clientTeams: ALL_CLIENT_TEAMS,
  eipCategories,
  breakouts,
  artifactExists: dir => fs.existsSync(path.join(ARTIFACTS_DIR, dir)),
});

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length > 0) {
  console.error(`\nData validation errors:\n\n${errors.map(error => `  - ${error}`).join('\n')}`);
  console.error(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log(`✓ Data references check out (${warnings.length} warning(s))`);
