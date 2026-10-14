import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectAgendaIssues } from './snapshot-github-content.mjs';

let tmp;

afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

const write = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
};

describe('collectAgendaIssues', () => {
  it('collects config.json issues and upcoming-call issues', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agendas-'));
    const artifacts = path.join(tmp, 'artifacts');
    write(path.join(artifacts, 'acde/2026-01-01_200/config.json'), { issue: 1500, videoUrl: 'x' });
    write(path.join(artifacts, 'acdc/2026-01-02_150/config.json'), { videoUrl: 'y' });
    write(path.join(artifacts, 'acdc/2026-01-02_150/tldr.json'), { issue: 9999 });
    const upcoming = path.join(tmp, 'upcoming-calls.json');
    write(upcoming, [{ issueNumber: 2000 }]);

    expect([...collectAgendaIssues(artifacts, upcoming)].sort()).toEqual([1500, 2000]);
  });

  it('tolerates a missing upcoming-calls snapshot', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agendas-'));
    const artifacts = path.join(tmp, 'artifacts');
    write(path.join(artifacts, 'acde/2026-01-01_200/config.json'), { issue: 1500 });

    expect([...collectAgendaIssues(artifacts, path.join(tmp, 'missing.json'))]).toEqual([1500]);
  });
});
