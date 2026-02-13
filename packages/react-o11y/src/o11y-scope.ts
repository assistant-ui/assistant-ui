import "@assistant-ui/store";

export type SpanItemState = {
  id: string;
  parentSpanId: string | null;
  name: string;
  type: string;
  status: "running" | "completed" | "failed" | "skipped";
  startedAt: number;
  endedAt: number | null;
  latencyMs: number | null;
  depth: number;
  hasChildren: boolean;
};

type SpanMethods = {
  getState: () => SpanItemState;
};

type SpanMeta = {
  source: "trace";
  query: { index: number } | { key: string };
};

export type TraceState = {
  spans: SpanItemState[];
  timeRange: { min: number; max: number };
  collapsedIds: string[];
};

type TraceMethods = {
  getState: () => TraceState;
  span: (lookup: SpanMeta["query"]) => SpanMethods;
  toggleCollapse: (spanId: string) => void;
};

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    trace: {
      methods: TraceMethods;
    };
    span: {
      methods: SpanMethods;
      meta: SpanMeta;
    };
  }
}
