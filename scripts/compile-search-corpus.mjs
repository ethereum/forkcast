import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CALLS_FILE = path.join(__dirname, '../src/data/protocol-calls.generated.json');
const ARTIFACTS_DIR = path.join(__dirname, '../public/artifacts');
const OUTPUT_FILE = path.join(__dirname, '../public/search-corpus.json');

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

const calls = JSON.parse(fs.readFileSync(CALLS_FILE, 'utf8'));
const corpus = calls.map(({ type, date, number }) => {
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

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(corpus));
console.log(`✓ Compiled ${corpus.length} calls to ${OUTPUT_FILE}`);
