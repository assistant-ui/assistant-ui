import "../o11y-scope";

import { resource, tapMemo, tapState, withKey } from "@assistant-ui/tap";
import { tapClientLookup, type ClientOutput } from "@assistant-ui/store";
import type { SpanItemState } from "../o11y-scope";

export type SpanData = {
  id: string;
  parentSpanId: string | null;
  name: string;
  type: string;
  status: "running" | "completed" | "failed" | "skipped";
  startedAt: number;
  endedAt: number | null;
  latencyMs: number | null;
};

const SpanItemResource = resource(
  ({ span }: { span: SpanItemState }): ClientOutput<"span"> => {
    return {
      getState: () => span,
    };
  },
);

function calculateDepth(
  spanId: string,
  spanMap: Map<string, SpanData>,
  cache: Map<string, number>,
): number {
  const cached = cache.get(spanId);
  if (cached !== undefined) return cached;

  const span = spanMap.get(spanId);
  if (!span || !span.parentSpanId) {
    cache.set(spanId, 0);
    return 0;
  }

  const depth = calculateDepth(span.parentSpanId, spanMap, cache) + 1;
  cache.set(spanId, depth);
  return depth;
}

function enrichSpans(rawSpans: SpanData[]): {
  allSpans: Map<string, SpanItemState>;
  timeRange: { min: number; max: number };
} {
  const spanMap = new Map<string, SpanData>();
  for (const span of rawSpans) {
    spanMap.set(span.id, span);
  }

  const depthCache = new Map<string, number>();
  const childrenCount = new Map<string, number>();
  for (const span of rawSpans) {
    if (span.parentSpanId) {
      childrenCount.set(
        span.parentSpanId,
        (childrenCount.get(span.parentSpanId) ?? 0) + 1,
      );
    }
  }

  const allSpans = new Map<string, SpanItemState>();
  let min = Infinity;
  let max = -Infinity;

  for (const span of rawSpans) {
    const depth = calculateDepth(span.id, spanMap, depthCache);
    const hasChildren = (childrenCount.get(span.id) ?? 0) > 0;
    allSpans.set(span.id, { ...span, depth, hasChildren });

    if (span.startedAt < min) min = span.startedAt;
    const end = span.endedAt ?? Date.now();
    if (end > max) max = end;
  }

  if (min === Infinity) min = Date.now();
  if (max === -Infinity) max = Date.now();
  if (max === min) max = min + 100;

  return { allSpans, timeRange: { min, max } };
}

function buildFlatList(
  allSpans: Map<string, SpanItemState>,
  collapsedIds: Set<string>,
): SpanItemState[] {
  const children = new Map<string | null, SpanItemState[]>();
  for (const span of allSpans.values()) {
    const parent = span.parentSpanId ?? null;
    let group = children.get(parent);
    if (!group) {
      group = [];
      children.set(parent, group);
    }
    group.push(span);
  }

  for (const group of children.values()) {
    group.sort((a, b) => a.startedAt - b.startedAt);
  }

  const result: SpanItemState[] = [];
  function dfs(parentId: string | null) {
    const kids = children.get(parentId);
    if (!kids) return;
    for (const span of kids) {
      result.push(span);
      if (!collapsedIds.has(span.id)) {
        dfs(span.id);
      }
    }
  }
  dfs(null);
  return result;
}

export const TraceResource = resource(
  ({ spans }: { spans: SpanData[] }): ClientOutput<"trace"> => {
    const { allSpans, timeRange } = tapMemo(() => enrichSpans(spans), [spans]);

    const [collapsedIds, setCollapsedIds] = tapState<Set<string>>(
      () => new Set(),
    );

    const visibleSpans = tapMemo(
      () => buildFlatList(allSpans, collapsedIds),
      [allSpans, collapsedIds],
    );

    const lookup = tapClientLookup(
      () =>
        visibleSpans.map((span) =>
          withKey(span.id, SpanItemResource({ span })),
        ),
      [visibleSpans],
    );

    const collapsedIdsList = tapMemo(() => [...collapsedIds], [collapsedIds]);

    const toggleCollapse = (spanId: string) => {
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        if (next.has(spanId)) {
          next.delete(spanId);
        } else {
          next.add(spanId);
        }
        return next;
      });
    };

    return {
      getState: () => ({
        spans: lookup.state,
        timeRange,
        collapsedIds: collapsedIdsList,
      }),
      span: lookup.get,
      toggleCollapse,
    };
  },
);
