import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Call } from '../../data/calls';
import { loadMeetingDecisions } from './keyDecisions';

const call = (type: string, date: string, number: string): Call => ({
  type,
  date,
  number,
  path: `${type}/${number}`,
});

const decision = (text: string) => ({ type: 'other', original_text: text, timestamp: '00:00:00' });

describe('loadMeetingDecisions', () => {
  let dir: string;

  const write = (rel: string, data: unknown) => {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
  };

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'key-decisions-'));
    write('acde/2026-01-01_001/key_decisions.json', { key_decisions: [decision('acde')] });
    write('acdt/2026-01-05_002/key_decisions.json', { key_decisions: [decision('acdt')] });
    write('acdt/2026-01-05_002/key_decisions_cl.json', { key_decisions: [decision('acdt cl')] });
    write('acdc/2026-01-02_003/key_decisions.json', { key_decisions: [] });
    write('epbs/2026-01-03_004/key_decisions.json', { key_decisions: [decision('breakout')] });
  });

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('reads ACD decisions, merges ACDT layer files, and sorts newest first', () => {
    const meetings = loadMeetingDecisions(
      [
        call('acde', '2026-01-01', '001'),
        call('acdt', '2026-01-05', '002'),
        call('acdc', '2026-01-02', '003'),
        call('epbs', '2026-01-03', '004'),
        call('acde', '2026-01-08', '005'), // no artifacts at all
      ],
      dir,
    );

    expect(meetings.map((m) => m.call.number)).toEqual(['002', '001']);
    expect(meetings[0].decisions.map((d) => d.original_text)).toEqual(['acdt', 'acdt cl']);
  });
});
