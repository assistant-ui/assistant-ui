"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useConsoleLogs,
  useSimulation,
  useActiveToolCall,
  useCancelActiveToolCall,
} from "@/lib/workbench/store";
import type { ConsoleEntry } from "@/lib/workbench/types";
import { ActivityEntry, CallToolGroupEntry } from "./activity-entry";
import { cn } from "@/lib/ui/cn";
import { ChevronDown, Circle, AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

function HangingCallIndicator() {
  const activeToolCall = useActiveToolCall();
  const cancelActiveToolCall = useCancelActiveToolCall();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!activeToolCall?.isHanging) return;

    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeToolCall?.isHanging]);

  if (!activeToolCall?.isHanging) {
    return null;
  }

  const elapsed = Math.floor((Date.now() - activeToolCall.startTime) / 1000);
  const remaining = Math.max(0, 30 - elapsed);

  return (
    <div className="mx-2 mb-2 rounded-md border border-amber-500/30 bg-amber-500/10">
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="size-4 animate-spin text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <div className="font-medium text-amber-700 text-sm dark:text-amber-300">
            Hang Simulation Active
          </div>
          <div className="text-amber-600/80 text-xs dark:text-amber-400/80">
            <code className="font-mono">{activeToolCall.toolName}</code>
            {" · "}
            {remaining > 0 ? `${remaining}s until timeout` : "timing out..."}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={cancelActiveToolCall}
          className="h-7 gap-1.5 text-amber-700 hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
        >
          <X className="size-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ConfiguredToolsSummary() {
  const simulation = useSimulation();
  const [isExpanded, setIsExpanded] = useState(true);

  const configuredTools = useMemo(() => {
    return Object.entries(simulation.tools).filter(([, config]) => {
      return (
        config.responseMode !== "success" ||
        JSON.stringify(config.responseData) !==
          JSON.stringify({ success: true })
      );
    });
  }, [simulation.tools]);

  if (configuredTools.length === 0) {
    return null;
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "success":
        return (
          <Circle className="size-1.5 fill-emerald-500 text-emerald-500" />
        );
      case "error":
        return <AlertCircle className="size-2.5 text-red-500" />;
      case "hang":
        return <Loader2 className="size-2.5 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-2 mb-2 rounded-md border border-border/40">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left transition-colors hover:bg-muted/40"
      >
        <ChevronDown
          className={cn(
            "size-3 shrink-0 text-muted-foreground/60 transition-transform duration-150",
            isExpanded ? "rotate-0" : "-rotate-90",
          )}
        />
        <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
          Configured Responses
        </span>
        <span className="ml-auto rounded-full bg-blue-500/10 px-1.5 py-0.5 font-medium text-[10px] text-blue-600 tabular-nums dark:text-blue-400">
          {configuredTools.length}
        </span>
      </button>

      {isExpanded && (
        <div className="border-border/40 border-t px-2 py-1.5">
          <div className="flex flex-wrap gap-1">
            {configuredTools.map(([toolName, config]) => (
              <div
                key={toolName}
                className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1"
              >
                {getModeIcon(config.responseMode)}
                <code className="text-[10px]">{toolName}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
      <HangingCallIndicator />
      <ConfiguredToolsSummary />

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
