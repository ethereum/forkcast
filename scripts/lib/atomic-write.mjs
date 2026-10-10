import { renameSync, rmSync, writeFileSync } from 'fs';

/**
 * Write a file by writing a sibling temp file and renaming it into place, so a
 * crash or full disk mid-write can't leave a truncated file behind.
 */
export function writeFileAtomic(path, data) {
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, data);
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}
