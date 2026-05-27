import type { ComponentProps, ReactNode } from "react";
import { Box, Text } from "ink";
import type { ChecklistItemData } from "@assistant-ui/core";
import { ChecklistRoot } from "./ChecklistRoot";
import { ChecklistItem } from "./ChecklistItem";
import { ChecklistProgress } from "./ChecklistProgress";

export type ChecklistViewProps = ComponentProps<typeof Box> & {
  items: ChecklistItemData[];
  title?: string;
  showProgress?: boolean;
  maxDepth?: number;
  renderItem?: (props: { item: ChecklistItemData; depth: number }) => ReactNode;
};

export const ChecklistView = ({
  items,
  title,
  showProgress,
  maxDepth,
  renderItem,
  ...boxProps
}: ChecklistViewProps) => {
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

ChecklistView.displayName = "ChecklistView";
