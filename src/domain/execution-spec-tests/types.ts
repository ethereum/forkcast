export interface EipTestCount {
  testFiles: number;
  testFunctions: number;
  testCases?: number;
  branch: string;
  directoryName: string;
}

export interface ExecutionSpecTestData {
  repo: string;
  fetchedAt: string;
  eips: Record<string, EipTestCount>;
}
