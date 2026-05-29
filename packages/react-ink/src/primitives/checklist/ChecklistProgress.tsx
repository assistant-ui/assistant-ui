import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import type { ChecklistItemData } from "./types";

export type ChecklistProgressProps = ComponentProps<typeof Box> & {
  items: ChecklistItemData[];
};

const countChecklist = (
  items: ChecklistItemData[],
): { done: number; total: number } => {
  let done = 0;
  let total = 0;
  for (const item of items) {
    total++;
    if (item.status === "complete" || item.status === "error") done++;
    if (item.children) {
      const child = countChecklist(item.children);
      done += child.done;
      total += child.total;
    }
  }
  return { done, total };
};

export const ChecklistProgress = ({
  items,
  ...boxProps
}: ChecklistProgressProps) => {
  const { done, total } = countChecklist(items);

  return (
    <Box {...boxProps}>
      <Text dimColor>
        {done}/{total} done
      </Text>
    </Box>
  );
};

ChecklistProgress.displayName = "ChecklistPrimitive.Progress";
