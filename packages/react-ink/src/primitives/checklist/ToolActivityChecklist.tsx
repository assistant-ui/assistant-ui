import type { ComponentProps, ReactNode } from "react";
import { Box, Text } from "ink";
import { useAuiState } from "@assistant-ui/store";
import type { MessagePartState } from "@assistant-ui/core";
import type { ChecklistItemData, ChecklistItemStatus } from "./types";
import { ChecklistRoot } from "./ChecklistRoot";
import { ChecklistItem } from "./ChecklistItem";
import { ChecklistProgress } from "./ChecklistProgress";

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
  return "pending";
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

export type ToolActivityChecklistProps = ComponentProps<typeof Box> & {
  title?: string;
  showProgress?: boolean;
  renderItem?: (props: { item: ChecklistItemData; depth: number }) => ReactNode;
  formatToolName?: (toolName: string) => string;
};

export const ToolActivityChecklist = ({
  title,
  showProgress,
  renderItem,
  formatToolName,
  ...boxProps
}: ToolActivityChecklistProps) => {
  const parts = useAuiState((s) => s.message.parts);

  const toolParts = parts.filter(
    (p): p is MessagePartState & { type: "tool-call" } =>
      p.type === "tool-call",
  );

  if (toolParts.length === 0) return null;

  const rawItems = toolParts.map((p) =>
    mapToolCallToChecklistItem(p, formatToolName),
  );

  let foundRunning = false;
  const items = rawItems.map((item) => {
    if (item.status === "running") {
      if (foundRunning) return { ...item, status: "pending" as const };
      foundRunning = true;
    }
    return item;
  });

  return (
    <ChecklistRoot {...boxProps}>
      {title ? <Text bold>{title}</Text> : null}
      {items.map((item) => (
        <ChecklistItem
          key={item.id}
          item={item}
          {...(renderItem ? { renderItem } : undefined)}
        />
      ))}
      {showProgress ? <ChecklistProgress items={items} /> : null}
    </ChecklistRoot>
  );
};

ToolActivityChecklist.displayName = "ToolActivityChecklist";
