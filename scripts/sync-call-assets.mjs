#!/usr/bin/env node
/**
 * Sync call assets from ethereum/pm repository.
 * Fetches manifest.json and downloads new/updated assets.
 */

import { writeFileSync, readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { generateConfig, normalizeManifest, updateConfig } from './sync-call-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const MANIFEST_URL = 'https://raw.githubusercontent.com/ethereum/pm/master/.github/ACDbot/artifacts/manifest.json';
const ASSETS_BASE_URL = 'https://raw.githubusercontent.com/ethereum/pm/master/.github/ACDbot/artifacts';
const LOCAL_ASSETS_DIR = join(ROOT, 'public/artifacts');
const DENYLIST = new Set([
  // Placeholder: 'series'
]);

const GENERATED_JSON_PATH = join(ROOT, 'src/data/protocol-calls.generated.json');
const KNOWN_TYPES = new Set(['acdc', 'acde', 'acdt', 'epbs', 'bal', 'focil', 'price', 'tli', 'pqts', 'rpc', 'zkevm', 'etm', 'awd', 'pqi', 'fcr', 'aa', 'p2p']);

// Map pm series names to forkcast type names (for folder paths)
const SERIES_TO_TYPE = {
  glamsterdamrepricings: 'price',
  trustlesslogindex: 'tli',
  pqtransactionsignatures: 'pqts',
  rpcstandards: 'rpc',
  encryptthemempool: 'etm',
  allwalletdevs: 'awd',
  pqinterop: 'pqi',
  nativeaa: 'aa',
  p2pnetworking: 'p2p',
};

function getLocalType(series) {
  return SERIES_TO_TYPE[series] || series;
}

async function fetchManifest() {
  console.log(`Fetching manifest from ${MANIFEST_URL}`);
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) throw new Error(`Failed to fetch manifest: ${response.status}`);
  return response.json();
}

async function downloadFile(url, destPath) {
  console.log(`  Downloading ${destPath.split('/').pop()}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const dir = dirname(destPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(destPath, buffer);
}

async function syncCall(remoteSeries, localType, callId, callData, force = false) {
  const localDir = join(LOCAL_ASSETS_DIR, localType, callId);
  const filesToSync = [];

  if (callData.has_tldr) {
    filesToSync.push({ remote: 'tldr.json', local: 'tldr.json' });
  }

  if (callData.has_chat) {
    filesToSync.push({ remote: 'chat.txt', local: 'chat.txt' });
  }

  if (callData.has_transcript_changelog) {
    filesToSync.push({ remote: 'transcript_changelog.tsv', local: 'transcript_changelog.tsv' });
  }

  // Prefer corrected transcript, fall back to original
  if (callData.has_corrected_transcript) {
    filesToSync.push({ remote: 'transcript_corrected.vtt', local: 'transcript_corrected.vtt' });
  } else if (callData.has_transcript) {
    filesToSync.push({ remote: 'transcript.vtt', local: 'transcript.vtt' });
  }

  if (filesToSync.length === 0) return false;

  // Ensure directory exists
  if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });

  let changesMade = false;

  // Handle config.json
  const configPath = join(localDir, 'config.json');
  if (!existsSync(configPath)) {
    console.log('  Generating config.json');
    const config = generateConfig(callData, localType);
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    changesMade = true;
  } else if (callData.videoUrl) {
    let existingConfig;
    try {
      existingConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.log(`  Warning: Could not update config.json: ${e.message}`);
      return changesMade;
    }

    const { config: updatedConfig, changed: configChanged } = updateConfig(existingConfig, callData, localType);
    if (configChanged) {
      if (existingConfig.videoUrl !== updatedConfig.videoUrl) {
        console.log('  Updating config.json videoUrl');
      }
      if (existingConfig.sync !== updatedConfig.sync) {
        console.log('  Updating config.json sync from manifest');
      }

      writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
      changesMade = true;
    }
  }

  // Download remote files
  for (const { remote, local } of filesToSync) {
    const remoteUrl = `${ASSETS_BASE_URL}/${remoteSeries}/${callId}/${remote}`;
    const localPath = join(localDir, local);

    // Skip if file exists and not forcing
    if (existsSync(localPath) && !force) continue;

    try {
      await downloadFile(remoteUrl, localPath);
      changesMade = true;
    } catch (e) {
      console.log(`  Warning: Could not download ${remote}: ${e.message}`);
    }
  }

  return changesMade;
}

function generateProtocolCallsJson(callsBySeries) {
  // Load existing generated calls to preserve history
  let existing = [];
  if (existsSync(GENERATED_JSON_PATH)) {
    try {
      existing = JSON.parse(readFileSync(GENERATED_JSON_PATH, 'utf-8'));
    } catch (e) {
      console.log(`Warning: Could not read existing generated JSON: ${e.message}`);
    }
  }

  const existingPaths = new Set(existing.map(c => c.path));
  let added = 0;

  for (const [series, seriesCalls] of Object.entries(callsBySeries)) {
    if (DENYLIST.has(series)) continue;

    const localType = getLocalType(series);

    const isOneOff = localType.startsWith('one-off-');
    if (!KNOWN_TYPES.has(localType) && !isOneOff) {
      console.log(`Warning: Unknown series "${series}" (resolved type: "${localType}"). Skipping.`);
      continue;
    }

    for (const [callId, callData] of Object.entries(seriesCalls)) {
      // Same filters as asset syncing
      if (!callData.has_tldr && !callData.has_transcript && !callData.has_corrected_transcript) {
        continue;
      }
      if (!callData.videoUrl) continue;

      // Parse callId: "2026-02-05_174" -> date "2026-02-05", number "174"
      const sepIndex = callId.lastIndexOf('_');
      if (sepIndex === -1) continue;

      const date = callId.substring(0, sepIndex);
      const number = callId.substring(sepIndex + 1).padStart(3, '0');
      const path = `${localType}/${number}`;

      if (!existingPaths.has(path)) {
        const entry = { type: localType, date, number, path };
        if (callData.issue) entry.issue = callData.issue;

        // For one-off calls, read local tldr.json to extract the meeting name
        if (isOneOff) {
          const tldrPath = join(LOCAL_ASSETS_DIR, localType, callId, 'tldr.json');
          if (existsSync(tldrPath)) {
            try {
              const tldr = JSON.parse(readFileSync(tldrPath, 'utf-8'));
              if (tldr.meeting) {
                // Strip trailing date suffix like " - March 5, 2026"
                entry.name = tldr.meeting.replace(/\s*-\s*[A-Z][a-z]+\s+\d{1,2},\s*\d{4}$/, '');
              }
            } catch (e) {
              console.log(`Warning: Could not read tldr.json for ${localType}/${callId}: ${e.message}`);
            }
          }
        }

        existing.push(entry);
        existingPaths.add(path);
        added++;
      }
    }
  }

  // Backfill issue numbers from manifest data
  const manifestByPath = new Map();
  for (const [series, seriesCalls] of Object.entries(callsBySeries)) {
    const localType = getLocalType(series);
    for (const [callId, callData] of Object.entries(seriesCalls)) {
      const sepIndex = callId.lastIndexOf('_');
      if (sepIndex === -1) continue;
      const number = callId.substring(sepIndex + 1).padStart(3, '0');
      const path = `${localType}/${number}`;
      if (callData.issue) manifestByPath.set(path, callData.issue);
    }
  }
  for (const entry of existing) {
    if (entry.issue) continue;
    const issue = manifestByPath.get(entry.path);
    if (issue) {
      entry.issue = issue;
    } else {
      // Fall back to local config.json — try both padded and unpadded number forms
      const unpadded = entry.number.replace(/^0+/, '') || '0';
      const candidates = [
        join(LOCAL_ASSETS_DIR, entry.type, `${entry.date}_${entry.number}`, 'config.json'),
        join(LOCAL_ASSETS_DIR, entry.type, `${entry.date}_${unpadded}`, 'config.json'),
      ];
      for (const configPath of candidates) {
        if (existsSync(configPath)) {
          try {
            const config = JSON.parse(readFileSync(configPath, 'utf-8'));
            if (config.issue) { entry.issue = config.issue; break; }
          } catch (_) {}
        }
      }
    }
  }

  // Sort by type (alpha) then date (ascending)
  existing.sort((a, b) => a.type.localeCompare(b.type) || a.date.localeCompare(b.date));

  writeFileSync(GENERATED_JSON_PATH, JSON.stringify(existing, null, 2) + '\n');
  console.log(`\nGenerated ${GENERATED_JSON_PATH}: ${existing.length} total calls (${added} new).`);
}

function parseForceCall(args) {
  const idx = args.indexOf('--force-call');
  if (idx === -1 || idx + 1 >= args.length) return null;
  const val = args[idx + 1];
  const [type, number] = val.split('/');
  if (!type || !number) {
    console.error(`Invalid --force-call value "${val}". Expected format: type/number (e.g., acde/238)`);
    process.exit(1);
  }
  return { type, number };
}

async function main() {
  const forceCall = parseForceCall(process.argv);

  const manifest = await fetchManifest();
  const callsBySeries = normalizeManifest(manifest);

  const syncedPaths = [];

  for (const [series, calls] of Object.entries(callsBySeries)) {
    if (DENYLIST.has(series)) continue;

    const localType = getLocalType(series);
    console.log(`\nProcessing ${series}${localType !== series ? ` (as ${localType})` : ''}...`);

    for (const [callId, callData] of Object.entries(calls)) {
      // Skip if no useful assets
      if (!callData.has_tldr && !callData.has_transcript && !callData.has_corrected_transcript) {
        continue;
      }

      // Skip calls without a video URL
      if (!callData.videoUrl) {
        continue;
      }

      const callNumber = callId.substring(callId.lastIndexOf('_') + 1);
      const force = forceCall && forceCall.type === localType && forceCall.number === callNumber;

      if (await syncCall(series, localType, callId, callData, force)) {
        syncedPaths.push(`${localType}/${callNumber}`);
        console.log(`  Synced ${callId}`);
      }
    }
  }

  generateProtocolCallsJson(callsBySeries);

  // Emit synced paths for CI commit message (via $GITHUB_OUTPUT)
  if (syncedPaths.length > 0 && process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `synced_paths=${syncedPaths.join(', ')}\n`);
  }

  console.log(`\nSync complete. ${syncedPaths.length} calls updated.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
