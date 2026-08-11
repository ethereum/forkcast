/**
 * Compiles `public/search-light.json` — the tier of the search corpus that every
 * page can afford to fetch (call summaries only, no transcripts or chat).
 *
 * Deliberately standalone from compile-search-corpus.mjs: any change to that
 * script's output bytes changes the sha256 clients use as an IndexedDB cache key,
 * forcing every visitor to re-download and re-index the ~19 MB heavy corpus.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { buildLightCorpus } from './lib/search-light.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CALLS_FILE = path.join(__dirname, '../src/data/protocol-calls.generated.json');
const ARTIFACTS_DIR = path.join(__dirname, '../public/artifacts');
const OUTPUT_FILE = path.join(__dirname, '../public/search-light.json');

const readJsonIfExists = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`Skipping invalid JSON file: ${filePath}`, error.message);
    return null;
  }
};

const callDir = ({ type, date, number }) => path.join(ARTIFACTS_DIR, type, `${date}_${number}`);

const calls = JSON.parse(fs.readFileSync(CALLS_FILE, 'utf8'));

const corpus = buildLightCorpus(
  calls,
  (call, relPath) => readJsonIfExists(path.join(callDir(call), relPath)),
  (call) => {
    const dir = callDir(call);
    return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  },
);

const serialized = JSON.stringify(corpus);
const entryCount = corpus.calls.reduce((sum, record) => sum + record.entries.length, 0);

// No sibling .meta.json: unlike the heavy corpus, this tier has no IndexedDB
// index to invalidate, so there's nothing for a hash to key and nothing worth an
// extra round trip to check before fetching 185 KB.
fs.writeFileSync(OUTPUT_FILE, serialized);

console.log(
  `✓ Compiled ${corpus.calls.length} call records / ${entryCount} entries ` +
    `(${Math.round(Buffer.byteLength(serialized, 'utf8') / 1024)} KB) to ${OUTPUT_FILE}`,
);
