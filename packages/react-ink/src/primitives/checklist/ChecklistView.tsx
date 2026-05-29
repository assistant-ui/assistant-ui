import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import type { ChecklistItemData } from "@assistant-ui/core";
import { ChecklistRoot } from "./ChecklistRoot";
import { ChecklistItem } from "./ChecklistItem";
import { ChecklistProgress } from "./ChecklistProgress";

export type ChecklistViewProps = ComponentProps<typeof Box> & {
  items: ChecklistItemData[];
  title?: string | undefined;
  showProgress?: boolean | undefined;
  maxDepth?: number | undefined;
};

export const ChecklistView = ({
  items,
  title,
  showProgress,
  maxDepth,
  ...boxProps
}: ChecklistViewProps) => {
  if (items.length === 0) return null;

  return (
    <ChecklistRoot {...boxProps}>
      {title ? <Text bold>{title}</Text> : null}
      {items.map((item) => (
        <ChecklistItem key={item.id} item={item} maxDepth={maxDepth} />
      ))}
      {showProgress ? <ChecklistProgress items={items} /> : null}
    </ChecklistRoot>
  );
};

ChecklistView.displayName = "ChecklistView";
