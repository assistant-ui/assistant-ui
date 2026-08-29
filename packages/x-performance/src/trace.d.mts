export type TraceEvent = {
  name?: string;
  pid?: number;
  tid?: number;
  ph?: string;
  ts?: number;
  dur?: number;
  args?: Record<string, unknown>;
};

export type TraceStats = {
  wallSeconds: number;
  mainBusyMs: number;
  mainBusyPct: number;
  compositorBusyMs: number;
  compositorBusyPct: number;
  counts: Record<string, number>;
};

export declare const captureTrace: (
  target: string,
  seconds: number,
  settleMs?: number,
) => Promise<TraceEvent[]>;

export declare const analyzeTrace: (
  events: TraceEvent[],
  urlHint: string,
  captureUs?: number,
) => TraceStats;
