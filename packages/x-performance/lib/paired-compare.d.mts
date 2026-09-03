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

export declare const pairNoise: (
  refRuns: Map<string, BenchRow>[],
  curRuns: Map<string, BenchRow>[],
) => Map<string, number>;

export declare const rowVerdict: (
  aRow: Pick<BenchRow, "mean" | "rme">,
  bRow: Pick<BenchRow, "mean" | "rme">,
  spread?: number,
) => { delta: number; noise: number; verdict: "~same" | "SLOWER" | "FASTER" };
