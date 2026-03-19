import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import type { ChecklistItemData } from "./types";

export type ChecklistProgressProps = ComponentProps<typeof Box> & {
  items: ChecklistItemData[];
};

const flattenItems = (items: ChecklistItemData[]): ChecklistItemData[] => {
  const result: ChecklistItemData[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children) {
      result.push(...flattenItems(item.children));
    }
  }
  return result;
};

export const ChecklistProgress = ({
  items,
  ...boxProps
}: ChecklistProgressProps) => {
  const flat = flattenItems(items);
  const done = flat.filter(
    (i) => i.status === "complete" || i.status === "error",
  ).length;
  const total = flat.length;

  return (
    <Box {...boxProps}>
      <Text dimColor>
        {done}/{total} complete
      </Text>
    </Box>
  );
};

ChecklistProgress.displayName = "ChecklistPrimitive.Progress";
