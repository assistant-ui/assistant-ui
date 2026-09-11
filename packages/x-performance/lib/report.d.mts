export type CompareRow = {
  id: string;
  a: number;
  b: number;
  delta: number;
  noise: number;
  measured?: boolean;
  touched?: string[];
};

export type Verdict = "~same" | "SLOWER" | "FASTER";

export type Side = { label: string; sha?: string; dirty?: boolean };

export type CompareMeta = {
  base: Side;
  head: Side;
  warnings: string[];
  changed?: string[];
  runs?: number;
  footer: string[];
};

export type Summary = {
  attributed: boolean;
  measured: (CompareRow & { verdict: Verdict })[];
  controls: CompareRow[];
  overshoot: number | undefined;
  overshootRow: CompareRow | undefined;
  scale: number;
  slower: number;
  faster: number;
  same: number;
  controlsPastFloor: number;
};

export type CompareDocRow = {
  id: string;
  bench: string;
  measured: boolean;
  touched: string[];
  base: number;
  head: number;
  delta: number;
  floor: number;
  verdict: Verdict | null;
};

export type CompareDoc = {
  schema: "aui-perf/compare@1";
  generatedAt: string;
  base: Side;
  head: Side;
  changed: string[] | null;
  runs: number | null;
  warnings: string[];
  summary: {
    measured: number;
    controls: number;
    slower: number;
    faster: number;
    same: number;
    controlsPastFloor: number;
    scale: number;
    overshoot: number | null;
    overshootBench: string | null;
  };
  rows: CompareDocRow[];
  footer: string[];
};

export type TraceMetrics = {
  wallSeconds: number;
  mainBusyMs: number;
  mainBusyPct: number;
  compositorBusyMs: number;
  compositorBusyPct: number;
  paintImage: number;
  commit: number;
  prePaint: number;
  frames: number;
};

export type TraceDoc = {
  schema: "aui-perf/trace@1";
  generatedAt: string;
  seconds: number;
  base: Side | null;
  head: Side;
  fixtures: {
    name: string;
    base: TraceMetrics | null;
    head: TraceMetrics;
    screenshots: { base?: string; head: string };
  }[];
};

export type LaneOutputs = { json?: string; report?: string };

export declare const MARKER: string;
export declare const fmt: (ms: number) => string;
export declare const shortId: (id: string) => string;
export declare const summarize: (rows: CompareRow[]) => Summary;
export declare const buildCompareDoc: (
  rows: CompareRow[],
  meta: CompareMeta,
) => CompareDoc;
export declare const renderCompareMarkdown: (
  doc: CompareDoc,
  options?: { controlLimit?: number; measuredLimit?: number },
) => string;
export declare const renderCompareTerminal: (doc: CompareDoc) => void;
export declare const renderTraceMarkdown: (doc: TraceDoc) => string;
export declare const renderTraceTerminal: (doc: TraceDoc) => void;
export declare const writeLaneOutputs: <T>(
  doc: T,
  outputs: LaneOutputs | undefined,
  render: (doc: T) => string,
) => void;
export declare const assembleReport: (options: {
  out: string;
  bench?: string | undefined;
  trace?: string | undefined;
}) => string;
