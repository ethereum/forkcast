import testData from '../../data/execution-spec-test-counts.json';

export interface ExecutionSpecTestCount {
  testFiles: number;
  testFunctions: number;
  testCases?: number;
  branch: string;
  directoryName: string;
}

export interface ExecutionSpecTestData {
  repo: string;
  fetchedAt: string;
  eips: Record<string, ExecutionSpecTestCount>;
}

type SortDirection = 'asc' | 'desc';

const data = testData as ExecutionSpecTestData;

export function getExecutionSpecTestCountForEip(eipNumber: number): ExecutionSpecTestCount | null {
  return data.eips[String(eipNumber)] ?? null;
}

export function getExecutionSpecTestCaseCount(testCount: ExecutionSpecTestCount): number {
  return testCount.testCases ?? testCount.testFunctions;
}

export function compareExecutionSpecTestCounts(
  a: ExecutionSpecTestCount | null | undefined,
  b: ExecutionSpecTestCount | null | undefined,
  sortDirection: SortDirection
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const comparison = getExecutionSpecTestCaseCount(a) - getExecutionSpecTestCaseCount(b);
  return sortDirection === 'asc' ? comparison : -comparison;
}

export function getExecutionSpecTestDirectoryUrl(testCount: ExecutionSpecTestCount): string {
  const branch = testCount.branch.replace(/^origin\//, '');
  return `https://github.com/${data.repo}/tree/${branch}/tests/amsterdam/${testCount.directoryName}`;
}
