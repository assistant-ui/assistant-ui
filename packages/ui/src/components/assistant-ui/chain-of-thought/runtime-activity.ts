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
/** Minimal message-part shape needed to infer collapsed chain activity. */
export type RuntimeActivityPart = {
  type?: string | undefined;
  toolName?: string | undefined;
  result?: unknown;
  interrupt?: unknown;
  text?: string | undefined;
  status?: ChainOfThoughtPartStatus | undefined;
};

/** Context passed to a {@link ToolActivity} resolver. */
export type ToolActivityContext = {
  toolName: string;
  statusType: ToolActivityStatusType;
  partStatusType: ToolActivityStatusType;
  chainStatusType: ToolActivityStatusType;
  messageStatusType: ToolActivityStatusType;
  fallbackLabel: string;
  part: RuntimeActivityPart;
};

/** User-provided resolver for the one-line tool activity shown in the trigger. */
export type ToolActivity = (context: ToolActivityContext) => string | undefined;

/** Narrows unknown values before reading tool result metadata. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Maps assistant-ui runtime status values onto timeline step states. */
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

/** Infers a timeline icon category from a tool name. */
export const inferStepTypeFromTool = (toolName: string): StepType => {
  const lower = toolName.toLowerCase();
  if (lower.includes("search")) return "search";
  if (lower.includes("image")) return "image";
  if (lower.includes("code") || lower.includes("javascript")) return "code";
  if (lower.includes("write")) return "write";
  return "tool";
};

/** Returns true for statuses where the model or tool is still doing work. */
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
  // Slice by code points, not UTF-16 units, so we never cut a surrogate pair
  // (emoji/astral chars) and emit a lone surrogate before the ellipsis.
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
  // `"*"` is a catch-all: one resolver can localize/customize every tool's
  // default activity label without enumerating each tool name.
  return named ?? toolActivityLabels["*"];
};

/** Fills missing part status from the surrounding chain/message status. */
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

/** Treats incomplete tool parts in streaming messages as active until a result arrives. */
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

/** Resolves the short activity label for a reasoning or tool part. */
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
    // Slice before normalizing so the whitespace regex stays O(1) regardless of
    // how long the reasoning grows — we only ever show the first ~72 chars.
    const text = normalizeActivityText(part.text?.slice(0, 200));
    if (!text) return undefined;
    // The runtime pins reasoning parts to `complete` even mid-stream, so base
    // the "Thinking:" prefix on the chain/message streaming state (not the
    // per-part status) to stay in sync with the streaming shimmer.
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

/** Finds the last reasoning or tool-call part in a chain. */
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

// The active part wins (live work); otherwise the latest reasoning/tool part
// drives the collapsed label. Both the label and `isCollapsedActivityReasoning`
// resolve the same part so they can never disagree.
const activeOrLatestPart = (parts: readonly RuntimeActivityPart[]) =>
  findActiveReasoningOrToolPart(parts) ?? findLastReasoningOrToolPart(parts);

/** Derives the collapsed trigger activity from the active or latest chain part. */
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

/**
 * Whether a reasoning part drives the current collapsed activity. Lets the live
 * region announce a stable label for reasoning (which streams token-by-token)
 * instead of the noisy per-token snippet — without sniffing the localized
 * reasoning prefix out of the rendered string. Returns a primitive so it stays
 * cheap as a `useAuiState` selector.
 */
export const isCollapsedActivityReasoning = (
  parts: readonly RuntimeActivityPart[],
): boolean => activeOrLatestPart(parts)?.type === "reasoning";

/** Extracts compact search result metadata from common tool result shapes. */
export const extractSearchResults = (
  toolName: string,
  result: unknown,
): { summary?: string | undefined; sources: string[] } | null => {
  if (!toolName.toLowerCase().includes("search")) return null;
  if (!isRecord(result)) return null;

  // Accept the common array shapes search tools return for their hit list.
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

  // Prefer an explicit `hits` count; otherwise fall back to the hit-list length
  // so object-shaped results (e.g. `{ items: [...] }`) still report a count.
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

/** Formats a search source URL without protocol noise. */
export const formatSearchSourceLabel = (source: string) => {
  try {
    const url = new URL(source);
    // Only de-noise real web links; keep other schemes (mailto:, etc.) intact
    // so the source isn't misrepresented as a normal URL.
    if (url.protocol !== "http:" && url.protocol !== "https:") return source;
    return `${url.hostname}${url.pathname}`;
  } catch {
    return source;
  }
};
