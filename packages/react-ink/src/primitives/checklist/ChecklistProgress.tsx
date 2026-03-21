import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import type { ChecklistItemData } from "@assistant-ui/core";
import { flattenChecklistItems } from "@assistant-ui/core";

export type ChecklistProgressProps = ComponentProps<typeof Box> & {
  items: ChecklistItemData[];
};

export const ChecklistProgress = ({
  items,
  ...boxProps
}: ChecklistProgressProps) => {
  const flat = flattenChecklistItems(items);
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
