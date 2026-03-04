#!/usr/bin/env node
/**
 * Scrape a devnet spec from HackMD and output structured JSON.
 * Usage: node scripts/scrape-devnet-spec.mjs bal-devnet-3
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'src/data/devnets');

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/scrape-devnet-spec.mjs <devnet-id>');
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(id)) {
  console.error(`Invalid devnet id: ${id}`);
  process.exit(1);
}

const DOWNLOAD_URL = `https://notes.ethereum.org/@ethpandaops/${id}/download`;

async function fetchMarkdown() {
  console.log(`Fetching ${DOWNLOAD_URL}`);
  const res = await fetch(DOWNLOAD_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${DOWNLOAD_URL}`);
  return res.text();
}

function parseTitle(md) {
  const match = md.match(/^# (.+)$/m);
  return match ? match[1].trim().replace(/\s+spec$/i, '') : id;
}

function parseAnnouncements(md) {
  const announcements = [];
  const infoBlockRegex = /:::info\n([\s\S]*?):::/g;
  let match;
  while ((match = infoBlockRegex.exec(md)) !== null) {
    let text = match[1].trim();
    // Strip leading emoji shortcodes like :mega:, :exclamation:, etc.
    text = text.replace(/^:[a-z_]+:\s*/i, '');
    // Strip leading unicode emoji (❗, 📢, etc.)
    text = text.replace(/^[\u{2000}-\u{3300}\u{FE00}-\u{FEFF}\u{1F000}-\u{1FFFF}]\s*/u, '');
    if (text) announcements.push(text);
  }
  return announcements;
}

function parseEipTable(md) {
  // Find the EIP list table - look for rows with [EIP-NNNN](url)
  const eips = [];
  const rowRegex =
    /\|\s*\[EIP-(\d+)\]\((https?:\/\/[^\s)]+)\)\s*\|\s*([^|]+?)\s*\|\s*([^|\n]*)/g;
  let match;
  while ((match = rowRegex.exec(md)) !== null) {
    const [, numberStr, url, title, statusRaw] = match;
    const statusTrimmed = statusRaw.trim();
    let status = null;
    if (statusTrimmed.includes(':up:')) status = 'updated';
    else if (statusTrimmed.includes(':new:') && /optional/i.test(statusTrimmed))
      status = 'new_optional';
    else if (statusTrimmed.includes(':new:')) status = 'new';

    eips.push({
      number: parseInt(numberStr, 10),
      title: title.trim().replace(/\s*:[a-z_]+:\s*/gi, ' ').trim(),
      status,
      url: url.trim(),
    });
  }
  return eips;
}

const STATUS_MAP = {
  '✅': 'supported',
  ':heavy_check_mark:': 'supported',
  '❌': 'not_supported',
  ':x:': 'not_supported',
  '🔨': 'in_progress',
  ':hammer:': 'in_progress',
  '❓': 'unknown',
  ':question:': 'unknown',
};

function parseClientMatrix(md, sectionPattern) {
  // Find the section
  const sectionIdx = md.search(sectionPattern);
  if (sectionIdx === -1) return { clients: [], matrix: [] };

  const afterSection = md.slice(sectionIdx);

  // Find the first table after the section heading
  const lines = afterSection.split('\n');
  let headerLine = null;
  let headerIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Look for a table header line (has | and isn't a separator)
    if (line.startsWith('|') && line.includes('|') && !line.match(/^\|[\s:\-]+\|/)) {
      // Check next line is separator
      const nextLine = (lines[i + 1] || '').trim();
      if (nextLine.match(/^\|[\s:\-|]+\|?$/)) {
        headerLine = line;
        headerIdx = i;
        break;
      }
    }
  }

  if (!headerLine || headerIdx === -1) return { clients: [], matrix: [] };

  // Parse header to get client names
  const headerCells = headerLine
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean);
  // First cell is the EIP/Feature column, rest are client names
  const clients = headerCells.slice(1);

  // Parse data rows
  const matrix = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|') || line.length < 3) break;

    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 2) break;

    // Parse label - extract EIP number from first cell
    const label = cells[0].replace(/\*\*/g, '').trim();
    const eipMatch = label.match(/(\d{4,})/);
    const eipNumber = eipMatch ? parseInt(eipMatch[1], 10) : 0;

    const support = {};
    for (let j = 0; j < clients.length; j++) {
      const cell = (cells[j + 1] || '').trim();
      support[clients[j]] = STATUS_MAP[cell] || cell || 'unknown';
    }

    matrix.push({ eipNumber, label, support });
  }

  return { clients, matrix };
}

function parseSpecLine(md, label) {
  // Match the line starting with **Label:** and find a markdown link or bare URL on it
  const lineMatch = md.match(
    new RegExp(`\\*\\*${label}:?\\*\\*[^\\n]*`),
  );
  if (!lineMatch) return null;
  const line = lineMatch[0];

  // Try markdown link: [version](url)
  const linkMatch = line.match(/\[`?([^`\]]+)`?\]\((https?:\/\/[^\s)]+)\)/);
  if (linkMatch) {
    return { version: linkMatch[1].trim(), url: linkMatch[2].trim() };
  }

  // Try bare URL
  const bareMatch = line.match(/(https?:\/\/\S+)/);
  if (bareMatch) {
    const url = bareMatch[1].trim();
    const tagMatch = url.match(/\/tag\/(.+?)$/);
    const version = tagMatch ? tagMatch[1] : url;
    return { version, url };
  }

  return null;
}

function parseSpecReferences(md) {
  return {
    consensusSpecs: parseSpecLine(md, 'Consensus Specs'),
    executionSpecs: parseSpecLine(md, 'Execution Specs'),
  };
}

async function main() {
  const md = await fetchMarkdown();

  const spec = {
    id,
    title: parseTitle(md),
    sourceUrl: `https://notes.ethereum.org/@ethpandaops/${id}`,
    scrapedAt: new Date().toISOString(),
    announcements: parseAnnouncements(md),
    eips: parseEipTable(md),
    elClientSupport: parseClientMatrix(
      md,
      /## Execution Layer Client Support|### Implementation tracker EL/,
    ),
    clClientSupport: parseClientMatrix(md, /### Implementation tracker CL/),
    specReferences: parseSpecReferences(md),
  };

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const outPath = join(OUTPUT_DIR, `${id}.json`);
  writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n');
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
