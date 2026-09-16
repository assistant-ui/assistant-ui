"use client";

import { useEffect, useState } from "react";
import type {
  ToolCallMessagePart,
  ToolCallMessagePartStatus,
} from "@assistant-ui/react";

export type TaskViewState = "working" | "waiting" | "done" | "failed";

export type TaskTiming = NonNullable<ToolCallMessagePart["timing"]>;

const LABEL_KEYS = [
  "description",
  "task",
  "title",
  "name",
  "prompt",
  "query",
  "instructions",
];

const META_KEYS = ["subagent_type", "subagentType", "agent", "model"];

function firstString(args: unknown, keys: readonly string[]) {
  if (typeof args !== "object" || args === null) return undefined;
  const record = args as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return undefined;
}

export function taskStateOf(
  status: ToolCallMessagePartStatus,
  isError?: boolean,
): TaskViewState {
  if (status.type === "running") return "working";
  if (status.type === "requires-action") return "waiting";
  if (status.type === "incomplete" || isError) return "failed";
  return "done";
}

export function taskLabel(toolName: string, args: unknown) {
  return firstString(args, LABEL_KEYS) ?? toolName;
}

export function taskMeta(args: unknown) {
  return firstString(args, META_KEYS);
}

export function formatElapsed(ms: number) {
  if (ms < 1000) return "<1s";
  const seconds = ms / 1000;
  if (seconds < 10) return `${(Math.floor(seconds * 10) / 10).toFixed(1)}s`;
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
}

export function useTaskElapsed(
  timing: TaskTiming | undefined,
  running: boolean,
) {
  const ticking =
    timing !== undefined && timing.completedAt === undefined && running;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ticking) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  if (timing === undefined) return undefined;
  if (timing.completedAt !== undefined) {
    return Math.max(0, timing.completedAt - timing.startedAt);
  }
  if (!ticking) return undefined;
  return Math.max(0, now - timing.startedAt);
}
