import "../o11y-scope";

import { useMemo, useState } from "react";
import { resource, withKey } from "@assistant-ui/tap";
import { useClientLookup, type ClientOutput } from "@assistant-ui/store";
import type { SpanItemState, SpanState } from "../o11y-scope";

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

function calculateDepth(
  spanId: string,
  parents: Map<string, string | null>,
  cache: Map<string, number>,
): number {
  const cached = cache.get(spanId);
  if (cached !== undefined) return cached;

  const path: string[] = [];
  let current: string | null = spanId;
  let depth = -1;

  while (current !== null) {
    const currentDepth = cache.get(current);
    if (currentDepth !== undefined) {
      depth = currentDepth;
      break;
    }

    path.push(current);
    current = parents.get(current) ?? null;
  }

  for (let index = path.length - 1; index >= 0; index--) {
    depth += 1;
    cache.set(path[index]!, depth);
  }

  return depth;
}

function normalizeSpanParents(
  spanMap: Map<string, SpanData>,
): Map<string, string | null> {
  const parents = new Map<string, string | null>();
  for (const span of spanMap.values()) {
    parents.set(
      span.id,
      span.parentSpanId && spanMap.has(span.parentSpanId)
        ? span.parentSpanId
        : null,
    );
  }

  const resolved = new Set<string>();
  for (const spanId of spanMap.keys()) {
    if (resolved.has(spanId)) continue;

    const path: string[] = [];
    const pathIds = new Set<string>();
    let current: string | null = spanId;

    while (current !== null && !resolved.has(current)) {
      if (pathIds.has(current)) {
        parents.set(current, null);
        break;
      }

      path.push(current);
      pathIds.add(current);
      current = parents.get(current) ?? null;
    }

    for (const id of path) resolved.add(id);
  }

  return parents;
}

function enrichSpans(rawSpans: SpanData[]): {
  allSpans: Map<string, SpanItemState>;
  parents: Map<string, string | null>;
  timeRange: { min: number; max: number };
} {
  const spanMap = new Map<string, SpanData>();
  for (const span of rawSpans) {
    spanMap.set(span.id, span);
  }

  const parents = normalizeSpanParents(spanMap);
  const depthCache = new Map<string, number>();
  const childrenCount = new Map<string, number>();
  for (const span of rawSpans) {
    const parentSpanId = parents.get(span.id);
    if (parentSpanId) {
      childrenCount.set(
        parentSpanId,
        (childrenCount.get(parentSpanId) ?? 0) + 1,
      );
    }
  }

  const allSpans = new Map<string, SpanItemState>();
  let min = Infinity;
  let max = -Infinity;

  for (const span of rawSpans) {
    const depth = calculateDepth(span.id, parents, depthCache);
    const hasChildren = (childrenCount.get(span.id) ?? 0) > 0;
    allSpans.set(span.id, {
      ...span,
      parentSpanId: parents.get(span.id) ?? null,
      depth,
      hasChildren,
      isCollapsed: false,
    });

    if (span.startedAt < min) min = span.startedAt;
    const end = span.endedAt ?? Date.now();
    if (end > max) max = end;
  }

  if (min === Infinity) min = Date.now();
  if (max === -Infinity) max = Date.now();
  if (max === min) max = min + 100;

  return { allSpans, parents, timeRange: { min, max } };
}

function buildFlatList(
  allSpans: Map<string, SpanItemState>,
  parents: Map<string, string | null>,
  collapsedIds: Set<string>,
): SpanItemState[] {
  const children = new Map<string | null, SpanItemState[]>();
  for (const span of allSpans.values()) {
    const parent = parents.get(span.id) ?? null;
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
      result.push({ ...span, isCollapsed: collapsedIds.has(span.id) });
      if (!collapsedIds.has(span.id)) {
        dfs(span.id);
      }
    }
  }
  dfs(null);
  return result;
}

const useSpanChildResource = ({
  span,
  timeRange,
  onToggleCollapse,
}: {
  span: SpanItemState;
  timeRange: { min: number; max: number };
  onToggleCollapse: (spanId: string) => void;
}): ClientOutput<"span"> => {
  const state: SpanState = {
    ...span,
    children: [],
    timeRange,
  };
  return {
    getState: () => state,
    child: () => {
      throw new Error("child spans do not have children in flat mode");
    },
    toggleCollapse: () => {
      onToggleCollapse(span.id);
    },
  };
};

const SpanChildResource = resource(useSpanChildResource);

const useSpanResource = ({
  spans,
}: {
  spans: SpanData[];
}): ClientOutput<"span"> => {
  const { allSpans, parents, timeRange } = useMemo(
    () => enrichSpans(spans),
    [spans],
  );

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const visibleSpans = useMemo(
    () => buildFlatList(allSpans, parents, collapsedIds),
    [allSpans, parents, collapsedIds],
  );

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

  const lookup = useClientLookup(
    visibleSpans.map((span) =>
      withKey(
        span.id,
        SpanChildResource({
          span,
          timeRange,
          onToggleCollapse: toggleCollapse,
        }),
      ),
    ),
  );

  const rootState: SpanState = {
    id: "__root__",
    parentSpanId: null,
    name: "",
    type: "root",
    status: "completed",
    startedAt: timeRange.min,
    endedAt: timeRange.max,
    latencyMs: timeRange.max - timeRange.min,
    depth: -1,
    hasChildren: lookup.state.length > 0,
    isCollapsed: false,
    children: lookup.state,
    timeRange,
  };

  return {
    getState: () => rootState,
    child: lookup.get,
    toggleCollapse: () => {
      // Root span collapse is a no-op
    },
  };
};

export const SpanResource = resource(useSpanResource);
