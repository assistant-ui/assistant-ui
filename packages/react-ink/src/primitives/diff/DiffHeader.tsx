import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import { useDiffContext } from "./DiffContext";

export type DiffHeaderProps = ComponentProps<typeof Box> & {
  fileIndex?: number;
};

export const DiffHeader = ({ fileIndex = 0, ...boxProps }: DiffHeaderProps) => {
  const { files } = useDiffContext();
  const file = files[fileIndex];
  if (!file) return null;

  const isDevNull = (n: string | undefined) => !n || n === "/dev/null";
  const renamed =
    !isDevNull(file.oldName) &&
    !isDevNull(file.newName) &&
    file.oldName !== file.newName;
  const displayName = isDevNull(file.newName) ? file.oldName : file.newName;

  return (
    <Box gap={1} {...boxProps}>
      {renamed ? (
        <>
          <Text bold dimColor>
            {file.oldName}
          </Text>
          <Text dimColor>{"->"}</Text>
          <Text bold>{file.newName}</Text>
        </>
      ) : (
        <Text bold>{displayName}</Text>
      )}
      <Text color="green">+{file.additions}</Text>
      <Text color="red">-{file.deletions}</Text>
    </Box>
  );
};

DiffHeader.displayName = "DiffPrimitive.Header";
