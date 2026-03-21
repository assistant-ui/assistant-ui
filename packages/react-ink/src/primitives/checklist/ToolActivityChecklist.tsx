import type { ComponentProps, ReactNode } from "react";
import { Box, Text } from "ink";
import { useToolActivityChecklist } from "@assistant-ui/core/react";
import type { ChecklistItemData } from "@assistant-ui/core";
import { ChecklistRoot } from "./ChecklistRoot";
import { ChecklistItem } from "./ChecklistItem";
import { ChecklistProgress } from "./ChecklistProgress";

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
  const items = useToolActivityChecklist({ formatToolName });

  if (items.length === 0) return null;

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
