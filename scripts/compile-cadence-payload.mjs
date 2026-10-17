import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EIPS_FILE = path.join(__dirname, '../src/data/eips.json');
const EIPS_MD_DIR = path.join(__dirname, '../public/eips');
const OUTPUT_FILE = path.join(__dirname, '../src/data/cadence-payload.json');

/**
 * Per-fork EIP counts and spec line totals for /cadence. Derived here rather
 * than committed as literals, because the upcoming fork's numbers move on every
 * stage change and every spec edit the EIP bot pulls in. Computing them in TS at
 * runtime would pull the 630 KB EIP chunk into the page, so this writes a few
 * hundred bytes instead.
 *
 * Mirrors SHIPPED_STATUSES / PLANNED_STATUSES in src/domain/cadence/timeline.ts.
 */
const SHIPPED_STATUSES = ['Included'];
const PLANNED_STATUSES = ['Scheduled', 'Networking'];

// Shapella and Dencun predate Forkcast's EIP dataset, so their EIP sets are
// literals, taken from ethereum.org and EIP-7569 respectively.
const PRE_COVERAGE_EIP_IDS = {
  Shapella: [3651, 3855, 3860, 4895, 6049],
  Dencun: [1153, 4788, 4844, 5656, 6780, 7044, 7045, 7514, 7516],
};

const specLines = (ids) =>
  ids.reduce(
    (total, id) =>
      total + fs.readFileSync(path.join(EIPS_MD_DIR, `${id}.md`), 'utf8').split('\n').length,
    0,
  );

/** EIP ids per fork whose latest status for that fork is in `statuses`. */
const idsByFork = (eips, statuses) => {
  const byFork = {};
  for (const eip of eips) {
    for (const rel of eip.forkRelationships ?? []) {
      const status = rel.statusHistory?.[rel.statusHistory.length - 1]?.status;
      if (!statuses.includes(status)) continue;
      (byFork[rel.forkName] ??= []).push(eip.id);
    }
  }
  return byFork;
};

const summarise = (byFork) =>
  Object.fromEntries(
    Object.entries(byFork).map(([fork, ids]) => [fork, { eips: ids.length, specLines: specLines(ids) }]),
  );

const eips = JSON.parse(fs.readFileSync(EIPS_FILE, 'utf8'));

const shipped = idsByFork(eips, SHIPPED_STATUSES);
for (const fork of Object.keys(PRE_COVERAGE_EIP_IDS)) delete shipped[fork];

const payload = {
  shipped: summarise({ ...PRE_COVERAGE_EIP_IDS, ...shipped }),
  planned: summarise(idsByFork(eips, PLANNED_STATUSES)),
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2) + '\n');
console.log(
  `✓ Compiled cadence payload for ${Object.keys(payload.shipped).length} shipped and ${Object.keys(payload.planned).length} planned forks to ${OUTPUT_FILE}`,
);
