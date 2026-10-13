import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { writeFileAtomic } from './atomic-write.mjs';

describe('writeFileAtomic', () => {
  it('replaces the file contents and leaves no temp file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atomic-write-'));
    const file = join(dir, 'data.json');
    writeFileSync(file, 'old');
    writeFileAtomic(file, 'new');
    expect(readFileSync(file, 'utf8')).toBe('new');
    expect(readdirSync(dir)).toEqual(['data.json']);
  });

  it('leaves the original untouched when the write fails', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atomic-write-'));
    const file = join(dir, 'data.json');
    writeFileSync(file, 'old');
    expect(() => writeFileAtomic(file, undefined)).toThrow();
    expect(readFileSync(file, 'utf8')).toBe('old');
    expect(readdirSync(dir)).toEqual(['data.json']);
  });
});
