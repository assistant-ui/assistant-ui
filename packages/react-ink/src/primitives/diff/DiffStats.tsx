import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import { useDiffContext } from "./DiffContext";

export type DiffStatsProps = ComponentProps<typeof Box> & {
  fileIndex?: number;
};

export const DiffStats = ({ fileIndex = 0, ...boxProps }: DiffStatsProps) => {
  const { files } = useDiffContext();
  const file = files[fileIndex];
  if (!file) return null;

  return (
    <Box gap={1} {...boxProps}>
      <Text>+{file.additions}</Text>
      <Text>-{file.deletions}</Text>
    </Box>
  );
};

DiffStats.displayName = "DiffPrimitive.Stats";
