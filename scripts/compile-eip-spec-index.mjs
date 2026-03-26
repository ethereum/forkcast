import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EIPS_MD_DIR = path.join(__dirname, '../public/eips');
const EIPS_JSON_DIR = path.join(__dirname, '../src/data/eips');
const OUTPUT_FILE = path.join(__dirname, '../public/eip-spec-index.json');

/** Strip markdown formatting to plain text for indexing. */
function stripMarkdown(md) {
  return (
    md
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, ' ')
      // Remove inline code
      .replace(/`[^`]+`/g, ' ')
      // Remove images
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      // Remove links but keep text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Remove headings markers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove emphasis markers
      .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, ' ')
      // Remove blockquote markers
      .replace(/^>\s+/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Remove table separators
      .replace(/\|?[-:]+[-|:]+\|?/g, ' ')
      // Remove pipe characters (table cells)
      .replace(/\|/g, ' ')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

const readTextIfExists = (filePath) =>
  fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;

const readJsonIfExists = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const index = [];

if (fs.existsSync(EIPS_MD_DIR)) {
  const mdFiles = fs
    .readdirSync(EIPS_MD_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort((a, b) => parseInt(a) - parseInt(b));

  for (const file of mdFiles) {
    const id = parseInt(file.replace('.md', ''), 10);
    if (isNaN(id)) continue;

    const md = readTextIfExists(path.join(EIPS_MD_DIR, file));
    if (!md) continue;

    // Skip Moved EIPs
    const meta = readJsonIfExists(path.join(EIPS_JSON_DIR, `${id}.json`));
    if (meta?.status === 'Moved') continue;

    const text = stripMarkdown(md);
    if (text.length > 0) {
      index.push({ id, text });
    }
  }
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index));
const bytes = Buffer.byteLength(JSON.stringify(index), 'utf8');
console.log(
  `✓ Compiled ${index.length} EIP spec entries to ${OUTPUT_FILE} (${(bytes / 1024 / 1024).toFixed(1)} MB)`,
);
