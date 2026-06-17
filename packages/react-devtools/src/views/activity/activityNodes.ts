import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventLogEntry } from "../../data/types";
import { eventScope } from "../../utils/common";
import { groupRuns } from "../runs/parse";
import type { RunEventEntry, RunPreview } from "../runs/types";

export type ActivityNode =
  | { id: "activity:stream"; kind: "stream" }
  | {
      id: "activity:orphans";
      kind: "orphans";
      events: readonly RunEventEntry[];
    }
  | { id: `activity:run:${string}`; kind: "run"; run: RunPreview };

const activityRunId = (runId: string) => `activity:run:${runId}` as const;

export const buildActivityNav = (logs: readonly EventLogEntry[]) => {
  const { runs, orphans } = groupRuns(logs);
  const nodes: ActivityNode[] = [{ id: "activity:stream", kind: "stream" }];

  for (const run of [...runs].reverse()) {
    nodes.push({
      id: activityRunId(run.id),
      kind: "run",
      run,
    });
  }

  if (orphans.length) {
    nodes.push({
      id: "activity:orphans",
      kind: "orphans",
      events: orphans,
    });
  }

  return { nodes, runs, orphans };
};

export const findActivityNode = (
  nodes: readonly ActivityNode[],
  nodeId: string | null,
): ActivityNode | undefined =>
  nodeId ? nodes.find((node) => node.id === nodeId) : undefined;

export const defaultActivitySelection = (nodes: readonly ActivityNode[]) => {
  const latestRun = nodes.find((node) => node.kind === "run");
  if (latestRun) return latestRun.id;
  if (nodes.some((node) => node.kind === "orphans")) return "activity:orphans";
  return "activity:stream";
};

export const useEventLogFilters = (logs: readonly EventLogEntry[]) => {
  const [unselectedEventTypes, setUnselectedEventTypes] = useState<Set<string>>(
    new Set(),
  );
  const knownEventTypesRef = useRef(new Set<string>());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDiffs, setShowDiffs] = useState(false);

  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedQuery(query.trim().toLowerCase()),
      150,
    );
    return () => clearTimeout(id);
  }, [query]);

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    logs.forEach((log) => types.add(log.event));
    return Array.from(types).sort();
  }, [logs]);

  const eventTypesByScope = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const type of eventTypes) {
      const scope = eventScope(type);
      const existing = grouped.get(scope);
      if (existing) {
        existing.push(type);
      } else {
        grouped.set(scope, [type]);
      }
    }
    return Array.from(grouped.entries());
  }, [eventTypes]);

  useEffect(() => {
    setUnselectedEventTypes((prev) => {
      const eventTypeSet = new Set(eventTypes);
      const next = new Set(prev);
      let changed = false;

      Array.from(next).forEach((value) => {
        if (!eventTypeSet.has(value)) {
          next.delete(value);
          knownEventTypesRef.current.delete(value);
          changed = true;
        }
      });

      eventTypes.forEach((type) => {
        if (!knownEventTypesRef.current.has(type)) {
          knownEventTypesRef.current.add(type);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [eventTypes]);

  const filteredLogs = useMemo(
    () =>
      logs.filter(
        (log) =>
          !unselectedEventTypes.has(log.event) &&
          (debouncedQuery === "" ||
            `${log.event} ${JSON.stringify(log.data)}`
              .toLowerCase()
              .includes(debouncedQuery)),
      ),
    [logs, unselectedEventTypes, debouncedQuery],
  );

  const toggleEventType = useCallback((eventType: string) => {
    setUnselectedEventTypes((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) {
        next.delete(eventType);
      } else {
        next.add(eventType);
      }
      return next;
    });
  }, []);

  const toggleScope = useCallback((types: string[]) => {
    setUnselectedEventTypes((prev) => {
      const allSelected = types.every((type) => !prev.has(type));
      const next = new Set(prev);
      for (const type of types) {
        if (allSelected) {
          next.add(type);
        } else {
          next.delete(type);
        }
      }
      return next;
    });
  }, []);

  return {
    eventTypes,
    eventTypesByScope,
    filteredLogs,
    query,
    setQuery,
    showDiffs,
    setShowDiffs,
    toggleEventType,
    toggleScope,
    unselectedEventTypes,
  };
};

export const previousSameScope = (
  logs: readonly EventLogEntry[],
  index: number,
): EventLogEntry | undefined => {
  const scope = eventScope(logs[index]!.event);
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (eventScope(logs[cursor]!.event) === scope) return logs[cursor];
  }
  return undefined;
};
