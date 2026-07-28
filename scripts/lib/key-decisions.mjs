import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ARTIFACTS_DIR = path.join(__dirname, '../../public/artifacts');

/**
 * Scan every call's key_decisions.json for stage-change decisions, yielding one
 * { id, fork, status, call, date, meeting } tuple per affected EIP.
 */
export function loadDecisions(artifactsDir = DEFAULT_ARTIFACTS_DIR) {
  const tuples = [];
  if (!fs.existsSync(artifactsDir)) return tuples;

  const types = fs.readdirSync(artifactsDir).filter((t) =>
    fs.statSync(path.join(artifactsDir, t)).isDirectory(),
  );

  for (const type of types) {
    const typeDir = path.join(artifactsDir, type);
    const callDirs = fs.readdirSync(typeDir).filter((c) =>
      fs.statSync(path.join(typeDir, c)).isDirectory(),
    );

    for (const callDir of callDirs) {
      const file = path.join(typeDir, callDir, 'key_decisions.json');
      if (!fs.existsSync(file)) continue;

      let data;
      try {
        data = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        continue; // skip malformed files
      }

      // Folder name is `{YYYY-MM-DD}_{numberPadded}`.
      const number = parseInt(callDir.split('_').pop(), 10);
      const call = `${type}/${number}`;
      const date = callDir.slice(0, 10);

      for (const d of data.key_decisions || []) {
        if (d.type !== 'stage_change') continue;
        if (!d.fork || !d.stage_change || !d.stage_change.to) continue;
        if (!Array.isArray(d.eips) || d.eips.length === 0) continue;

        for (const id of d.eips) {
          tuples.push({
            id,
            fork: d.fork,
            status: d.stage_change.to,
            call,
            date,
            meeting: data.meeting,
          });
        }
      }
    }
  }

  return tuples;
}

/**
 * Set of every EIP ID with a recorded stage-change decision. Useful as an
 * auto-discovery signal — any EIP the ACD calls have acted on.
 */
export function loadDecisionEipIds(artifactsDir = DEFAULT_ARTIFACTS_DIR) {
  return new Set(loadDecisions(artifactsDir).map((d) => d.id));
}
