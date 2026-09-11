export type LaneOutputs = { json?: string; report?: string };

export declare const stageFixture: (
  fixture: string,
  sideRoot: string,
  outDir: string,
) => string;

export declare const trace: (
  targets: string[],
  seconds: number,
  outputs?: LaneOutputs,
) => Promise<void>;

export declare const traceRef: (
  ref: string,
  targets: string[],
  seconds: number,
  outputs?: LaneOutputs,
) => Promise<void>;
