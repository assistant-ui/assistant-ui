export type HistoryRow = {
  id: string;
  mean: number;
  rme: number;
};

export type HistoryPoint = {
  schema: "aui-perf/history@1";
  date: string;
  sha: string;
  env: {
    cpu: string;
    cores: number;
    arch: string;
    platform: string;
    node: string;
    runs: number;
    estimator: string;
  };
  rows: HistoryRow[];
};

export type HistoryRecording = {
  env: {
    date: string;
    cpu: string;
    cores: number;
    arch: string;
    platform: string;
    node: string;
    sha: string;
    dirty: boolean;
    runs: number;
    estimator: string;
  };
  benchmarks: (HistoryRow & {
    name: string;
    hz: number;
    p99: number;
    samples: number[];
  })[];
};

export declare const appendHistory: (options: {
  dir: string;
  recording: HistoryRecording;
  now?: Date;
}) => string;
export declare const readHistory: (dir: string) => HistoryPoint[];
export declare const renderHistory: (options: {
  dir: string;
  now?: Date;
  window?: number;
}) => string;
