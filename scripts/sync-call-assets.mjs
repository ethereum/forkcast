#!/usr/bin/env node
/**
 * Sync call assets from ethereum/pm repository.
 * Fetches manifest.json and downloads new/updated assets.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const MANIFEST_URL = 'https://raw.githubusercontent.com/ethereum/pm/master/.github/ACDbot/artifacts/manifest.json';
const ASSETS_BASE_URL = 'https://raw.githubusercontent.com/ethereum/pm/master/.github/ACDbot/artifacts';
const LOCAL_ASSETS_DIR = join(ROOT, 'public/artifacts');
const DENYLIST = new Set([
  // Placeholder: 'series'
]);

const GENERATED_JSON_PATH = join(ROOT, 'src/data/protocol-calls.generated.json');
const KNOWN_TYPES = new Set(['acdc', 'acde', 'acdt', 'epbs', 'bal', 'focil', 'price', 'tli', 'pqts', 'rpc', 'zkevm', 'etm', 'awd']);

// Map pm series names to forkcast type names (for folder paths)
const SERIES_TO_TYPE = {
  glamsterdamrepricings: 'price',
  trustlesslogindex: 'tli',
  pqtransactionsignatures: 'pqts',
  rpcstandards: 'rpc',
  encryptthemempool: 'etm',
  allwalletdevs: 'awd',
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

function normalizeManifest(manifest) {
  if (manifest?.series && typeof manifest.series === 'object') {
    const normalized = {};
    for (const [series, seriesData] of Object.entries(manifest.series)) {
      const calls = {};
      for (const call of seriesData.calls || []) {
        const callId = call?.path?.split('/')?.[1];
        if (!callId) continue;
        const resources = call.resources || {};
        calls[callId] = {
          has_tldr: Boolean(resources.tldr),
          has_transcript: Boolean(resources.transcript),
          has_corrected_transcript: Boolean(resources.transcript_corrected),
          has_chat: Boolean(resources.chat),
          has_transcript_changelog: Boolean(resources.changelog),
          last_updated: call.updated || call.date || null,
          // Metadata for config.json generation
          issue: call.issue || null,
          videoUrl: call.videoUrl || null
        };
      }
      normalized[series] = calls;
    }
    return normalized;
  }

  return manifest.calls || {};
}

const LIVESTREAMED_TYPES = new Set(['acdc', 'acde', 'acdt']);

function generateConfig(callData, localType) {
  const needsManualSync = LIVESTREAMED_TYPES.has(localType);
  return {
    issue: callData.issue,
    videoUrl: callData.videoUrl,
    sync: {
      transcriptStartTime: needsManualSync ? null : '00:00:00',
      videoStartTime: needsManualSync ? null : '00:00:00'
    }
  };
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
    // Create new config from manifest data
    console.log('  Generating config.json');
    const config = generateConfig(callData, localType);
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    changesMade = true;
  } else if (callData.videoUrl) {
    // Update videoUrl if existing config has null and manifest has a value
    try {
      const existingConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (existingConfig.videoUrl !== callData.videoUrl) {
        console.log('  Updating config.json videoUrl');
        existingConfig.videoUrl = callData.videoUrl;
        writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
        changesMade = true;
      }
    } catch (e) {
      console.log(`  Warning: Could not update config.json: ${e.message}`);
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

    if (!KNOWN_TYPES.has(localType)) {
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
        existing.push({ type: localType, date, number, path });
        existingPaths.add(path);
        added++;
      }
    }
  }

  // Sort by type (alpha) then date (ascending)
  existing.sort((a, b) => a.type.localeCompare(b.type) || a.date.localeCompare(b.date));

  writeFileSync(GENERATED_JSON_PATH, JSON.stringify(existing, null, 2) + '\n');
  console.log(`\nGenerated ${GENERATED_JSON_PATH}: ${existing.length} total calls (${added} new).`);
}

async function main() {
  const force = process.argv.includes('--force');

  const manifest = await fetchManifest();
  const callsBySeries = normalizeManifest(manifest);

  let totalSynced = 0;

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

      if (await syncCall(series, localType, callId, callData, force)) {
        console.log(`  Synced ${callId}`);
        totalSynced++;
      }
    }
  }

  generateProtocolCallsJson(callsBySeries);

  console.log(`\nSync complete. ${totalSynced} calls updated.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});