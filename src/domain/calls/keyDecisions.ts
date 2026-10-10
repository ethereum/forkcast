import fs from 'node:fs';
import path from 'node:path';
import { ACD_TYPES, BREAKOUT_SUFFIXES, type Call } from '../../data/calls';
import type { KeyDecision } from '../../types/eip';

export interface MeetingDecisions {
  call: Call;
  decisions: KeyDecision[];
}

const readKeyDecisions = (file: string): KeyDecision[] => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))?.key_decisions ?? [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    return [];
  }
};

/**
 * Key decisions for every ACD call that has any, newest first. Build-time only:
 * reads `key_decisions.json` (plus ACDT's per-layer `_cl`/`_el` files) from the
 * artifacts directory so pages get them as props instead of fetching ~250 URLs,
 * most of which 404, in the browser.
 */
export function loadMeetingDecisions(
  calls: ReadonlyArray<Call>,
  artifactsDir: string = path.join(process.cwd(), 'public/artifacts'),
): MeetingDecisions[] {
  const meetings: MeetingDecisions[] = [];
  for (const call of calls) {
    if (!ACD_TYPES.includes(call.type)) continue;
    const dir = path.join(artifactsDir, call.type, `${call.date}_${call.number}`);
    const suffixes = call.type === 'acdt' ? ['', ...BREAKOUT_SUFFIXES.map((s) => `_${s}`)] : [''];
    const decisions = suffixes.flatMap((s) => readKeyDecisions(path.join(dir, `key_decisions${s}.json`)));
    if (decisions.length > 0) meetings.push({ call, decisions });
  }
  return meetings.sort((a, b) => b.call.date.localeCompare(a.call.date));
}
