import type {
  MessagePartStatus,
  MessageStatus,
  ToolCallMessagePartStatus,
} from "@assistant-ui/react";
import { pluralize, type StepStatus, type StepType } from "./model";

type ChainOfThoughtPartStatus = MessagePartStatus | ToolCallMessagePartStatus;
type ToolActivityStatusType =
  | ChainOfThoughtPartStatus["type"]
  | MessageStatus["type"]
  | undefined;
export type RuntimeActivityPart = {
  type?: string | undefined;
  toolName?: string | undefined;
  result?: unknown;
  interrupt?: unknown;
  text?: string | undefined;
  status?: ChainOfThoughtPartStatus | undefined;
};

export type ToolActivityContext = {
  toolName: string;
  statusType: ToolActivityStatusType;
  partStatusType: ToolActivityStatusType;
  chainStatusType: ToolActivityStatusType;
  messageStatusType: ToolActivityStatusType;
  fallbackLabel: string;
  part: RuntimeActivityPart;
};

export type ToolActivity = (context: ToolActivityContext) => string | undefined;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const mapPartStatusToStepStatus = (
  statusType: ToolActivityStatusType,
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

export const isMessageStatusStreaming = (
  statusType: ToolActivityStatusType,
) => {
  return statusType === "running" || statusType === "requires-action";
};

const normalizeActivityText = (value: string | undefined) => {
  if (!value) return "";
  return value.replaceAll(/\s+/g, " ").trim();
};

const truncateActivity = (value: string, maxLength = 72) => {
  // Slice by code points to avoid dangling surrogates.
  const chars = Array.from(value);
  if (chars.length <= maxLength) return value;
  return `${chars.slice(0, maxLength - 1).join("")}…`;
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
  edit: { running: "Editing", complete: "Edited" },
  update: { running: "Updating", complete: "Updated" },
  delete: { running: "Deleting", complete: "Deleted" },
  list: { running: "Listing", complete: "Listed" },
  send: { running: "Sending", complete: "Sent" },
  execute: { running: "Executing", complete: "Executed" },
  navigate: { running: "Navigating", complete: "Navigated" },
  open: { running: "Opening", complete: "Opened" },
  generate: { running: "Generating", complete: "Generated" },
  call: { running: "Calling", complete: "Called" },
};

const getDefaultToolActivityLabel = (
  toolLabel: string,
  statusType: ToolActivityStatusType,
) => {
  const words = normalizeActivityText(toolLabel).toLowerCase().split(" ");
  const verb = words[0] ?? "";
  const subject = words.slice(1).join(" ").trim();
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
  if (!toolActivityLabels) return undefined;
  const named = toolName ? toolActivityLabels[toolName] : undefined;
  return named ?? toolActivityLabels["*"];
};

export const partStatusOrFallback = (
  partStatusType: ToolActivityStatusType,
  chainStatusType: ToolActivityStatusType,
  messageStatusType: ToolActivityStatusType,
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
  part: RuntimeActivityPart | undefined,
  statusType: ToolActivityStatusType,
  messageStatusType: ToolActivityStatusType,
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
  part: RuntimeActivityPart | undefined,
  statusType: ToolActivityStatusType,
  toolActivityLabels: Record<string, ToolActivity> | undefined,
  chainStatusType: ToolActivityStatusType,
  messageStatusType: ToolActivityStatusType,
  reasoningActivity?: ((snippet: string) => string) | undefined,
): string | undefined => {
  if (part?.type === "tool-call") {
    const effectiveStatusType = inferToolActivityStatusType(
      part,
      statusType,
      messageStatusType,
    );
    const toolName = part.toolName;
    const tool = humanizeToolName(toolName);
    const resolver = getToolActivityResolver(toolName, toolActivityLabels);
    const resolved = normalizeActivityText(
      resolver?.({
        toolName: toolName ?? "",
        statusType: effectiveStatusType,
        partStatusType: part.status?.type,
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
    // Bound whitespace normalization before truncating the snippet.
    const text = normalizeActivityText(part.text?.slice(0, 200));
    if (!text) return undefined;
    // Reasoning parts can be complete while the chain is still streaming.
    const isStreaming =
      isMessageStatusStreaming(statusType) ||
      isMessageStatusStreaming(chainStatusType) ||
      isMessageStatusStreaming(messageStatusType);
    const snippet = truncateActivity(text);
    if (isStreaming) {
      return reasoningActivity
        ? reasoningActivity(snippet)
        : `Thinking: ${snippet}`;
    }
    return snippet;
  }

  return undefined;
};

export const findLastReasoningOrToolPart = (
  parts: readonly RuntimeActivityPart[],
) => {
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    if (part?.type === "tool-call" || part?.type === "reasoning") {
      return part;
    }
  }
  return undefined;
};

const findActiveReasoningOrToolPart = (
  parts: readonly RuntimeActivityPart[],
) => {
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    const statusType = part?.status?.type;
    if (
      (part?.type === "tool-call" || part?.type === "reasoning") &&
      (statusType === "running" || statusType === "requires-action")
    ) {
      return part;
    }
  }
  return undefined;
};

const activeOrLatestPart = (parts: readonly RuntimeActivityPart[]) =>
  findActiveReasoningOrToolPart(parts) ?? findLastReasoningOrToolPart(parts);

export const deriveCollapsedActivity = ({
  parts,
  chainStatusType,
  messageStatusType,
  toolActivityLabels,
  reasoningActivity,
}: {
  parts: readonly RuntimeActivityPart[];
  chainStatusType: ToolActivityStatusType;
  messageStatusType: ToolActivityStatusType;
  toolActivityLabels: Record<string, ToolActivity> | undefined;
  reasoningActivity?: ((snippet: string) => string) | undefined;
}): string | undefined => {
  const part = activeOrLatestPart(parts);
  if (!part) return undefined;

  return getActivityFromPart(
    part,
    partStatusOrFallback(part.status?.type, chainStatusType, messageStatusType),
    toolActivityLabels,
    chainStatusType,
    messageStatusType,
    reasoningActivity,
  );
};

export const isCollapsedActivityReasoning = (
  parts: readonly RuntimeActivityPart[],
): boolean => activeOrLatestPart(parts)?.type === "reasoning";

export const extractSearchResults = (
  toolName: string,
  result: unknown,
): { summary?: string | undefined; sources: string[] } | null => {
  if (!toolName.toLowerCase().includes("search")) return null;
  if (!isRecord(result)) return null;

  const sourceArray = [
    result.sources,
    result.results,
    result.items,
    result.documents,
  ].find(Array.isArray);
  const sources = Array.isArray(sourceArray)
    ? sourceArray.filter(
        (source): source is string => typeof source === "string",
      )
    : [];

  const hits = result.hits;
  const count =
    typeof hits === "number" && Number.isInteger(hits) && hits >= 0
      ? hits
      : Array.isArray(sourceArray) && sourceArray.length > 0
        ? sourceArray.length
        : undefined;
  const summary =
    typeof result.summary === "string"
      ? result.summary
      : count != null
        ? `Found ${count} ${pluralize(count, "result")}.`
        : undefined;

  if (!summary && sources.length === 0) return null;
  return summary ? { summary, sources } : { sources };
};

export const formatSearchSourceLabel = (source: string) => {
  try {
    const url = new URL(source);
    // Keep non-web schemes intact.
    if (url.protocol !== "http:" && url.protocol !== "https:") return source;
    return `${url.hostname}${url.pathname}`;
  } catch {
    return source;
  }
};
