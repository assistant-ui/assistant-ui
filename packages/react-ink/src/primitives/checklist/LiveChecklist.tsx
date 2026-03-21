import type { ComponentProps, ReactNode } from "react";
import { Text } from "ink";
import type { ChecklistItemData } from "@assistant-ui/core";
import { ChecklistRoot } from "./ChecklistRoot";
import { ChecklistItem } from "./ChecklistItem";
import { ChecklistProgress } from "./ChecklistProgress";
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
        {...(renderItem ? { renderItem } : undefined)}
        {...(formatToolName ? { formatToolName } : undefined)}
        {...boxProps}
      />
    );
  }

  if (items.length === 0) return null;

  return (
    <ChecklistRoot {...boxProps}>
      {title ? <Text bold>{title}</Text> : null}
      {items.map((item) => (
        <ChecklistItem
          key={item.id}
          item={item}
          {...(maxDepth !== undefined ? { maxDepth } : undefined)}
          {...(renderItem ? { renderItem } : undefined)}
        />
      ))}
      {showProgress ? <ChecklistProgress items={items} /> : null}
    </ChecklistRoot>
  );
};

LiveChecklist.displayName = "LiveChecklist";
