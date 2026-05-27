import type { ComponentProps, ReactNode } from "react";
import type { ChecklistItemData } from "@assistant-ui/core";
import { ChecklistView } from "./ChecklistView";
import { ToolActivityChecklist } from "./ToolActivityChecklist";
import type { Box } from "ink";

export type LiveChecklistProps = ComponentProps<typeof Box> & {
  items?: ChecklistItemData[];
  formatToolName?: (toolName: string) => string;
  title?: string;
  showProgress?: boolean;
  maxDepth?: number;
  renderItem?: (props: { item: ChecklistItemData; depth: number }) => ReactNode;
};

export const LiveChecklist = ({
  items,
  formatToolName,
  title,
  showProgress,
  maxDepth,
  renderItem,
  ...boxProps
}: LiveChecklistProps) => {
  if (!items) {
    return (
      <ToolActivityChecklist
        {...(title ? { title } : undefined)}
        {...(showProgress ? { showProgress } : undefined)}
        {...(maxDepth !== undefined ? { maxDepth } : undefined)}
        {...(renderItem ? { renderItem } : undefined)}
        {...(formatToolName ? { formatToolName } : undefined)}
        {...boxProps}
      />
    );
  }

  return (
    <ChecklistView
      items={items}
      {...(title ? { title } : undefined)}
      {...(showProgress ? { showProgress } : undefined)}
      {...(maxDepth !== undefined ? { maxDepth } : undefined)}
      {...(renderItem ? { renderItem } : undefined)}
      {...boxProps}
    />
  );
};

LiveChecklist.displayName = "LiveChecklist";
