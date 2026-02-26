"use client";

import { createContext } from "react";
import type { StepStatus, StepType } from "./core";

type ToolActivityContext = {
  toolName: string;
  statusType: string | undefined;
  partStatusType: string | undefined;
  chainStatusType: string | undefined;
  messageStatusType: string | undefined;
  fallbackLabel: string;
  part: unknown;
};

export type ToolActivity = (context: ToolActivityContext) => string | undefined;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const mapPartStatusToStepStatus = (
  statusType: string | undefined,
): StepStatus => {
  if (statusType === "running" || statusType === "requires-action") {
    return "active";
  }
  if (statusType === "incomplete") {
    return "error";
  }
  return "complete";
};

export const inferStepTypeFromTool = (toolName: string): StepType => {
  const lower = toolName.toLowerCase();
  if (lower.includes("search")) return "search";
  if (lower.includes("image")) return "image";
  if (lower.includes("code") || lower.includes("javascript")) return "code";
  if (lower.includes("write")) return "write";
  return "tool";
};

export const isMessageStatusStreaming = (statusType: string | undefined) => {
  return statusType === "running" || statusType === "requires-action";
};

const normalizeActivityText = (value: string | undefined) => {
  if (!value) return "";
  return value.replaceAll(/\s+/g, " ").trim();
};

const truncateActivity = (value: string, maxLength = 72) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
};

const humanizeToolName = (toolName: string | undefined) => {
  const normalized = normalizeActivityText(toolName);
  if (!normalized) return "tool";
  return normalized.replaceAll(/[_-]+/g, " ");
};

const TOOL_ACTIVITY_VERB_INFLECTIONS: Record<
  string,
  { running: string; complete: string }
> = {
  search: { running: "Searching", complete: "Searched" },
  fetch: { running: "Fetching", complete: "Fetched" },
  analyze: { running: "Analyzing", complete: "Analyzed" },
  run: { running: "Running", complete: "Ran" },
  create: { running: "Creating", complete: "Created" },
  write: { running: "Writing", complete: "Wrote" },
  query: { running: "Querying", complete: "Queried" },
  read: { running: "Reading", complete: "Read" },
  get: { running: "Getting", complete: "Got" },
};

const normalizeToolActivitySubject = (subject: string) => {
  if (subject === "web") return "the web";
  return subject;
};

const getDefaultToolActivityLabel = (
  toolLabel: string,
  statusType: string | undefined,
) => {
  const words = normalizeActivityText(toolLabel).toLowerCase().split(" ");
  const verb = words[0] ?? "";
  const rawSubject = words.slice(1).join(" ").trim();
  const subject = normalizeToolActivitySubject(rawSubject);
  const inflection = TOOL_ACTIVITY_VERB_INFLECTIONS[verb];

  if (statusType === "requires-action") {
    return `Waiting on ${subject || toolLabel}`;
  }
  if (statusType === "incomplete") {
    return `Error in ${subject || toolLabel}`;
  }
  if (inflection) {
    if (statusType === "running") {
      return subject ? `${inflection.running} ${subject}` : inflection.running;
    }
    return subject ? `${inflection.complete} ${subject}` : inflection.complete;
  }
  if (statusType === "running") {
    return `Using ${toolLabel}`;
  }
  return `Used ${toolLabel}`;
};

const getToolActivityResolver = (
  toolName: string | undefined,
  toolActivityLabels: Record<string, ToolActivity> | undefined,
) => {
  if (!toolName || !toolActivityLabels) return undefined;
  return toolActivityLabels[toolName];
};

const getToolActivityLabel = (
  toolName: string | undefined,
  _toolActivityLabels: Record<string, ToolActivity> | undefined,
) => {
  return humanizeToolName(toolName);
};

export const partStatusOrFallback = (
  partStatusType: string | undefined,
  chainStatusType: string | undefined,
  messageStatusType: string | undefined,
) => {
  if (partStatusType) return partStatusType;
  if (
    chainStatusType === "requires-action" ||
    messageStatusType === "requires-action"
  ) {
    return "requires-action";
  }
  if (chainStatusType === "running") return "running";
  return chainStatusType ?? messageStatusType;
};

export const inferToolActivityStatusType = (
  part: any,
  statusType: string | undefined,
  messageStatusType: string | undefined,
) => {
  if (part?.type !== "tool-call") return statusType;
  if (
    statusType === "running" ||
    statusType === "requires-action" ||
    statusType === "incomplete"
  ) {
    return statusType;
  }
  if (!isMessageStatusStreaming(messageStatusType)) return statusType;
  if (part?.interrupt) return "requires-action";
  if (part?.result === undefined) return "running";
  return statusType;
};

export const getActivityFromPart = (
  part: any,
  statusType: string | undefined,
  toolActivityLabels: Record<string, ToolActivity> | undefined,
  chainStatusType: string | undefined,
  messageStatusType: string | undefined,
): string | undefined => {
  if (part?.type === "tool-call") {
    const effectiveStatusType = inferToolActivityStatusType(
      part,
      statusType,
      messageStatusType,
    );
    const toolName = part.toolName as string | undefined;
    const tool = getToolActivityLabel(toolName, toolActivityLabels);
    const resolver = getToolActivityResolver(toolName, toolActivityLabels);
    const resolved = normalizeActivityText(
      resolver?.({
        toolName: toolName ?? "",
        statusType: effectiveStatusType,
        partStatusType: part?.status?.type as string | undefined,
        chainStatusType,
        messageStatusType,
        fallbackLabel: tool,
        part,
      } satisfies ToolActivityContext),
    );
    if (resolved) return resolved;
    return getDefaultToolActivityLabel(tool, effectiveStatusType);
  }

  if (part?.type === "reasoning") {
    const text = normalizeActivityText(part.text as string | undefined);
    if (!text) return undefined;
    if (statusType === "running" || statusType === "requires-action") {
      return `Thinking: ${truncateActivity(text)}`;
    }
    return truncateActivity(text);
  }

  return undefined;
};

export const findLastReasoningOrToolPart = (parts: readonly any[]) => {
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    if (part?.type === "tool-call" || part?.type === "reasoning") {
      return part;
    }
  }
  return undefined;
};

const findActiveReasoningOrToolPart = (parts: readonly any[]) => {
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    const statusType = part?.status?.type as string | undefined;
    if (
      (part?.type === "tool-call" || part?.type === "reasoning") &&
      (statusType === "running" || statusType === "requires-action")
    ) {
      return part;
    }
  }
  return undefined;
};

export const deriveCollapsedActivity = ({
  parts,
  chainStatusType,
  messageStatusType,
  toolActivityLabels,
}: {
  parts: readonly any[];
  chainStatusType: string | undefined;
  messageStatusType: string | undefined;
  toolActivityLabels: Record<string, ToolActivity> | undefined;
}) => {
  if (parts.length === 0) return undefined;

  const activePart = findActiveReasoningOrToolPart(parts);
  if (activePart) {
    return getActivityFromPart(
      activePart,
      partStatusOrFallback(
        activePart.status?.type as string | undefined,
        chainStatusType,
        messageStatusType,
      ),
      toolActivityLabels,
      chainStatusType,
      messageStatusType,
    );
  }

  const lastPart = findLastReasoningOrToolPart(parts);
  if (!lastPart) return undefined;

  const statusType = partStatusOrFallback(
    lastPart.status?.type as string | undefined,
    chainStatusType,
    messageStatusType,
  );
  return getActivityFromPart(
    lastPart,
    statusType,
    toolActivityLabels,
    chainStatusType,
    messageStatusType,
  );
};

export const ToolActivityLabelsContext = createContext<
  Record<string, ToolActivity> | undefined
>(undefined);

export const extractSearchResults = (
  toolName: string,
  result: unknown,
): { summary?: string; sources: string[] } | null => {
  if (!toolName.toLowerCase().includes("search")) return null;
  if (!isRecord(result)) return null;

  const sourcesValue = result.sources;
  const sources = Array.isArray(sourcesValue)
    ? sourcesValue.filter(
        (source): source is string => typeof source === "string",
      )
    : [];
  const summary =
    typeof result.summary === "string"
      ? result.summary
      : typeof result.hits === "number"
        ? `Found ${result.hits} result${result.hits === 1 ? "" : "s"}.`
        : undefined;

  if (!summary && sources.length === 0) return null;
  return summary ? { summary, sources } : { sources };
};

export const formatSearchSourceLabel = (source: string) => {
  try {
    const url = new URL(source);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return source;
  }
};
