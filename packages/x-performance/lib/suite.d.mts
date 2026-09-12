export type SuiteRow = {
  id: string;
  name: string;
  mean: number;
  hz: number;
  rme: number;
  p99: number;
  samples: number;
};

export type EnvStamp = {
  date: string;
  cpu: string;
  cores: number;
  arch: string;
  platform: string;
  node: string;
  sha: string;
  dirty: boolean;
};

export declare const pkgRoot: string;
export declare const perfDir: string;
export declare const git: (args: string[], cwd?: string) => string;
export declare const repoRoot: () => string;
export declare const envStamp: (root?: string) => EnvStamp;
export declare const flattenBenchmarks: (raw: unknown) => SuiteRow[];
export declare const runSuite: (
  extraEnv?: Record<string, string>,
) => SuiteRow[];
