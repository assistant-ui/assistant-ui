"use client";

import { useCallback, useMemo, useState } from "react";
import { useConsoleLogs } from "@/lib/workbench/store";
import type { ConsoleEntry } from "@/lib/workbench/types";
import { ActivityEntry, CallToolGroupEntry } from "./activity-entry";

function extractToolName(method: string): string | null {
  const match = method.match(/callTool\("([^"]+)"\)/);
  return match ? match[1] : null;
}

function getRecencyOpacity(index: number): number {
  const PLATEAU = 2;
  const MIN_OPACITY = 0.4;
  const DECAY_RATE = 0.08;

  if (index < PLATEAU) return 1;
  return Math.max(MIN_OPACITY, 1 - (index - PLATEAU) * DECAY_RATE);
}

function isResponseEntry(_args: unknown, result: unknown): boolean {
  return result !== undefined;
}

interface EntryGroup {
  id: string;
  request: ConsoleEntry;
  response: ConsoleEntry | null;
}

function groupCallToolEntries(
  logs: ConsoleEntry[],
): (ConsoleEntry | EntryGroup)[] {
  const result: (ConsoleEntry | EntryGroup)[] = [];
  const pendingRequests = new Map<string, ConsoleEntry>();

  for (const entry of logs) {
    if (entry.type !== "callTool") {
      result.push(entry);
      continue;
    }

    const toolName = extractToolName(entry.method);
    const isResponse = isResponseEntry(entry.args, entry.result);

    if (!isResponse) {
      if (toolName) {
        pendingRequests.set(toolName, entry);
      }
      result.push({ id: entry.id, request: entry, response: null });
    } else {
      const pendingRequest = toolName ? pendingRequests.get(toolName) : null;
      if (pendingRequest) {
        const groupIndex = result.findIndex(
          (item) => "request" in item && item.request.id === pendingRequest.id,
        );
        if (groupIndex !== -1) {
          (result[groupIndex] as EntryGroup).response = entry;
          pendingRequests.delete(toolName!);
          continue;
        }
      }
      result.push(entry);
    }
  }

  return result;
}

export function ActivitySection() {
  const logs = useConsoleLogs();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const groupedAndReversed = useMemo(() => {
    const grouped = groupCallToolEntries(logs);
    return [...grouped].reverse();
  }, [logs]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (logs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground/60 text-xs">
        Events will appear here
      </div>
    );
  }

  return (
    <div className="scrollbar-subtle -mx-2 h-full min-h-0 overflow-y-auto pb-24">
      <div className="divide-y divide-border/0">
        {groupedAndReversed.map((item, index) => {
          const recencyOpacity = getRecencyOpacity(index);

          if ("request" in item) {
            return (
              <CallToolGroupEntry
                key={item.id}
                request={item.request}
                response={item.response}
                requestExpanded={expandedIds.has(item.request.id)}
                responseExpanded={
                  item.response ? expandedIds.has(item.response.id) : false
                }
                onToggleRequest={() => toggleExpanded(item.request.id)}
                onToggleResponse={() =>
                  item.response && toggleExpanded(item.response.id)
                }
                recencyOpacity={recencyOpacity}
              />
            );
          }
          return (
            <ActivityEntry
              key={item.id}
              entry={item}
              isExpanded={expandedIds.has(item.id)}
              onToggle={() => toggleExpanded(item.id)}
              recencyOpacity={recencyOpacity}
            />
          );
        })}
      </div>
    </div>
  );
}
