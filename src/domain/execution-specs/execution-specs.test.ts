import { describe, expect, it } from 'vitest';
import {
  compareExecutionSpecTestCounts,
  getExecutionSpecTestCaseCount,
  getExecutionSpecTestDirectoryUrl,
  type ExecutionSpecTestCount,
} from './execution-specs';

const makeTestCount = (
  overrides: Partial<ExecutionSpecTestCount> = {}
): ExecutionSpecTestCount => ({
  testFiles: 1,
  testFunctions: 3,
  branch: 'origin/devnets/bal/7',
  directoryName: 'eip1234_example',
  ...overrides,
});

describe('execution spec test counts', () => {
  it('uses collected case counts when available and falls back to function counts', () => {
    const parametrized = makeTestCount({ testFunctions: 3, testCases: 12 });
    const unparametrized = makeTestCount({ testFunctions: 3 });

    expect(getExecutionSpecTestCaseCount(parametrized)).toBe(12);
    expect(getExecutionSpecTestCaseCount(unparametrized)).toBe(3);
  });

  it('sorts by test coverage while keeping missing counts last', () => {
    const smaller = makeTestCount({ testFunctions: 3 });
    const larger = makeTestCount({ testFunctions: 3, testCases: 12 });

    expect(compareExecutionSpecTestCounts(smaller, larger, 'asc')).toBeLessThan(0);
    expect(compareExecutionSpecTestCounts(smaller, larger, 'desc')).toBeGreaterThan(0);
    expect(compareExecutionSpecTestCounts(null, larger, 'asc')).toBeGreaterThan(0);
    expect(compareExecutionSpecTestCounts(null, larger, 'desc')).toBeGreaterThan(0);
  });

  it('builds repository links without the remote prefix', () => {
    expect(getExecutionSpecTestDirectoryUrl(makeTestCount())).toBe(
      'https://github.com/ethereum/execution-specs/tree/devnets/bal/7/tests/amsterdam/eip1234_example'
    );
  });
});
