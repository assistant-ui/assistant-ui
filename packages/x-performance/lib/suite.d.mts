export const pkgRoot: string;

export const flattenBenchmarks: (raw: unknown) => {
  id: string;
  name: string;
  mean: number;
  hz: number;
  rme: number;
  p99: number;
  samples: number;
}[];
