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
  isCollapsed: boolean;
};

export type SpanState = SpanItemState & {
  children: SpanItemState[];
  timeRange: { min: number; max: number };
};

type SpanMethods = {
  getState: () => SpanState;
  child: (lookup: SpanMeta["query"]) => SpanMethods;
  toggleCollapse: () => void;
};

type SpanMeta = {
  source: "span";
  query: { index: number } | { key: string };
};

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    span: {
      methods: SpanMethods;
      meta: SpanMeta;
    };
  }
}
