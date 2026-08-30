export type BenchRow = {
  id: string;
  name: string;
  mean: number;
  hz: number;
  rme: number;
  p99: number;
  samples: number;
};

export declare const meanRows: (
  runsList: Map<string, BenchRow>[],
) => Map<string, BenchRow>;

export declare const pairSpreads: (
  refRuns: Map<string, BenchRow>[],
  curRuns: Map<string, BenchRow>[],
) => Map<string, number>;
