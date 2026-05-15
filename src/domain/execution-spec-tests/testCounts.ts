import testData from '../../data/execution-spec-test-counts.json';
import type { EipTestCount, ExecutionSpecTestData } from './types';

const data = testData as ExecutionSpecTestData;

export function getTestCountForEip(eipNumber: number): EipTestCount | null {
  return data.eips[String(eipNumber)] ?? null;
}

export function getTestCountMap(): Map<number, EipTestCount> {
  const map = new Map<number, EipTestCount>();
  for (const [eipStr, counts] of Object.entries(data.eips)) {
    map.set(parseInt(eipStr, 10), counts);
  }
  return map;
}

export function getTestDirectoryUrl(testCount: EipTestCount): string {
  const branch = testCount.branch.replace(/^origin\//, '');
  return `https://github.com/${data.repo}/tree/${branch}/tests/amsterdam/${testCount.directoryName}`;
}
