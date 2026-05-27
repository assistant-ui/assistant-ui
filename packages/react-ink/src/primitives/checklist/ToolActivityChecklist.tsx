import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";
import { useToolActivityChecklist } from "@assistant-ui/core/react";
import type { ChecklistItemData } from "@assistant-ui/core";
import { ChecklistView } from "./ChecklistView";

export type ToolActivityChecklistProps = ComponentProps<typeof Box> & {
  title?: string;
  showProgress?: boolean;
  maxDepth?: number;
  renderItem?: (props: { item: ChecklistItemData; depth: number }) => ReactNode;
  formatToolName?: (toolName: string) => string;
};

export const ToolActivityChecklist = ({
  title,
  showProgress,
  maxDepth,
  renderItem,
  formatToolName,
  ...boxProps
}: ToolActivityChecklistProps) => {
  const items = useToolActivityChecklist({ formatToolName });

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

ToolActivityChecklist.displayName = "ToolActivityChecklist";
