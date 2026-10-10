import { readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { callTypeNames, pmSeriesToCallType } from './callSeries';

const ARTIFACTS_DIR = join(__dirname, '../../public/artifacts');

// Artifact folders that aren't a series of their own: ACDT breakout rooms hang
// off their parent call through `breakouts.ts`.
const NON_SERIES_DIRS = new Set(['acdt-breakouts']);

describe('call series registry', () => {
  it('names every artifact folder', () => {
    const unknown = readdirSync(ARTIFACTS_DIR, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(dir => !(dir in callTypeNames) && !dir.startsWith('one-off-') && !NON_SERIES_DIRS.has(dir));

    expect(unknown).toEqual([]);
  });

  it('maps pm series names onto registered slugs', () => {
    for (const type of Object.values(pmSeriesToCallType)) {
      expect(callTypeNames).toHaveProperty(type);
    }
  });
});
