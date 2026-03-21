import { useAuiState } from "@assistant-ui/store";
import type { MessagePartState } from "../../runtime/api/message-part-runtime";
import type {
  ChecklistItemData,
  ChecklistItemStatus,
} from "../../types/checklist";

const resolveChecklistStatus = (
  part: {
    isError?: boolean | undefined;
    result?: unknown;
    interrupt?: unknown;
  },
  status?: { type: string },
): ChecklistItemStatus => {
  if (status?.type === "requires-action") return "running";
  if (status?.type === "incomplete") return "error";
  if (status?.type === "complete") {
    return part.isError ? "error" : "complete";
  }
  if (status?.type === "running") return "running";
  if (part.isError) return "error";
  if (part.result !== undefined) return "complete";
  if (part.interrupt) return "running";
  return "running";
};

const truncateDetail = (argsText: string, maxLen = 40): string | undefined => {
  if (!argsText || argsText === "{}") return undefined;
  try {
    const parsed = JSON.parse(argsText);
    const keys = Object.keys(parsed);
    if (keys.length === 0) return undefined;
    const first = `${keys[0]}: ${JSON.stringify(parsed[keys[0]!])}`;
    return first.length > maxLen ? `${first.slice(0, maxLen)}...` : first;
  } catch {
    return argsText.length > maxLen
      ? `${argsText.slice(0, maxLen)}...`
      : argsText;
  }
};

export const mapToolCallToChecklistItem = (
  part: MessagePartState & { type: "tool-call" },
  formatToolName?: (name: string) => string,
): ChecklistItemData => {
  const detail = truncateDetail(part.argsText);
  return {
    id: part.toolCallId,
    text: formatToolName ? formatToolName(part.toolName) : part.toolName,
    status: resolveChecklistStatus(part, part.status),
    ...(detail !== undefined ? { detail } : undefined),
  };
};

export type UseToolActivityChecklistOptions = {
  formatToolName?: ((toolName: string) => string) | undefined;
};

export const useToolActivityChecklist = (
  options?: UseToolActivityChecklistOptions,
): ChecklistItemData[] => {
  const parts = useAuiState((s) => s.message.parts);

  const toolParts = parts.filter(
    (p): p is MessagePartState & { type: "tool-call" } =>
      p.type === "tool-call",
  );

  const rawItems = toolParts.map((p) =>
    mapToolCallToChecklistItem(p, options?.formatToolName),
  );

  let foundRunning = false;
  return rawItems.map((item) => {
    if (item.status === "running") {
      if (foundRunning) return { ...item, status: "pending" as const };
      foundRunning = true;
    }
    return item;
  });
};
