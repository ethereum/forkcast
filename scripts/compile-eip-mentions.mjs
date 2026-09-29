/**
 * Compiles `src/data/eip-mentions-index.json` — which calls mentioned each EIP.
 *
 * The EIP page's Mentions tab needs to know *whether* an EIP has mentions before
 * it renders: the tab bar decides every other conditional tab synchronously from
 * bundled data, and a tab that appears one round trip after paint would reflow
 * the bar and make `?tab=mentions` impossible to validate. So this index is
 * imported, and only the mention bodies are fetched on demand.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { buildEipMentionsIndex } from './lib/eip-mentions-index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CALLS_FILE = path.join(__dirname, '../src/data/protocol-calls.generated.json');
const ARTIFACTS_DIR = path.join(__dirname, '../public/artifacts');
const OUTPUT_FILE = path.join(__dirname, '../src/data/eip-mentions-index.json');

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

const index = buildEipMentionsIndex(
  calls,
  (call, relPath) => readJsonIfExists(path.join(callDir(call), relPath)),
  (call) => {
    const dir = callDir(call);
    return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  },
);

// An artifact whose call never made it into protocol-calls.generated.json is
// dropped above — silently, since it has no page to link to. Say so here: it is
// the symptom of a call sync that landed artifacts without regenerating the list.
const listed = new Set(calls.map((call) => `${call.type}/${call.date}_${call.number}`));
for (const type of fs.existsSync(ARTIFACTS_DIR) ? fs.readdirSync(ARTIFACTS_DIR) : []) {
  const typeDir = path.join(ARTIFACTS_DIR, type);
  if (!fs.statSync(typeDir).isDirectory()) continue;
  for (const dir of fs.readdirSync(typeDir)) {
    if (!fs.existsSync(path.join(typeDir, dir, 'eip_mentions.json'))) continue;
    if (!listed.has(`${type}/${dir}`)) {
      console.warn(`eip_mentions.json in ${type}/${dir} has no entry in protocol-calls.generated.json — skipped`);
    }
  }
}

const serialized = JSON.stringify(index);
fs.writeFileSync(OUTPUT_FILE, serialized);

const eipCount = Object.keys(index.eips).length;
const callCount = Object.keys(index.calls).length;
console.log(
  `✓ Compiled ${eipCount} EIPs across ${callCount} call sources ` +
    `(${Math.round(Buffer.byteLength(serialized, 'utf8') / 1024)} KB) to ${OUTPUT_FILE}`,
);
