import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CALLS_FILE = path.join(__dirname, '../src/data/protocol-calls.generated.json');
const ARTIFACTS_DIR = path.join(__dirname, '../public/artifacts');
const EIPS_MD_DIR = path.join(__dirname, '../public/eips');
const EIPS_JSON_DIR = path.join(__dirname, '../src/data/eips');
const OUTPUT_FILE = path.join(__dirname, '../public/search-corpus.json');
const META_OUTPUT_FILE = path.join(__dirname, '../public/search-corpus.meta.json');

const readTextIfExists = (filePath) => (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null);

const readJsonIfExists = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`Skipping invalid JSON file: ${filePath}`, error.message);
    return null;
  }
};

// Build call corpus
const calls = JSON.parse(fs.readFileSync(CALLS_FILE, 'utf8'));
const callCorpus = calls.map(({ type, date, number }) => {
  const basePath = path.join(ARTIFACTS_DIR, type, `${date}_${number}`);
  return {
    type,
    date,
    number,
    transcript: readTextIfExists(path.join(basePath, 'transcript_corrected.vtt')) ?? readTextIfExists(path.join(basePath, 'transcript.vtt')),
    chat: readTextIfExists(path.join(basePath, 'chat.txt')),
    tldr: readJsonIfExists(path.join(basePath, 'tldr.json')),
  };
});

// Build EIP spec corpus
const eipSpecCorpus = [];
if (fs.existsSync(EIPS_MD_DIR)) {
  const mdFiles = fs
    .readdirSync(EIPS_MD_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort((a, b) => parseInt(a) - parseInt(b));

  for (const file of mdFiles) {
    const eipId = parseInt(file.replace('.md', ''), 10);
    if (isNaN(eipId)) continue;

    const mdContent = readTextIfExists(path.join(EIPS_MD_DIR, file));
    if (!mdContent) continue;

    // Read title from JSON metadata if available; skip Moved EIPs
    const jsonData = readJsonIfExists(path.join(EIPS_JSON_DIR, `${eipId}.json`));
    if (jsonData?.status === 'Moved') continue;
    const title = jsonData?.title || `EIP-${eipId}`;

    eipSpecCorpus.push({
      type: 'eip-spec',
      eipId,
      title,
      content: mdContent,
    });
  }
}

const corpus = [...callCorpus, ...eipSpecCorpus];
const serializedCorpus = JSON.stringify(corpus);
const sha256 = createHash('sha256').update(serializedCorpus).digest('hex');
const metadata = {
  sha256,
  calls: callCorpus.length,
  eipSpecs: eipSpecCorpus.length,
  bytes: Buffer.byteLength(serializedCorpus, 'utf8')
};

fs.writeFileSync(OUTPUT_FILE, serializedCorpus);
fs.writeFileSync(META_OUTPUT_FILE, JSON.stringify(metadata));
console.log(`✓ Compiled ${callCorpus.length} calls + ${eipSpecCorpus.length} EIP specs to ${OUTPUT_FILE}`);
