import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import { DiffRoot } from "./DiffRoot";
import { DiffHeader } from "./DiffHeader";
import { DiffContent } from "./DiffContent";
import { useDiffContext } from "./DiffContext";

export type DiffViewProps = ComponentProps<typeof Box> & {
  patch?: string | undefined;
  oldFile?: { content: string; name?: string | undefined } | undefined;
  newFile?: { content: string; name?: string | undefined } | undefined;
  showLineNumbers?: boolean | undefined;
  contextLines?: number | undefined;
  maxLines?: number | undefined;
};

interface DiffViewInnerProps {
  showLineNumbers: boolean | undefined;
  contextLines: number | undefined;
  maxLines: number | undefined;
}

const DiffViewInner = ({
  showLineNumbers,
  contextLines,
  maxLines,
}: DiffViewInnerProps) => {
  const { files } = useDiffContext();

  if (files.length === 0) {
    return <Text dimColor>No diff content</Text>;
  }

  return (
    <>
      {files.map((_, i) => (
        <Box key={i} flexDirection="column">
          <DiffHeader fileIndex={i} />
          <DiffContent
            fileIndex={i}
            showLineNumbers={showLineNumbers}
            contextLines={contextLines}
            maxLines={maxLines}
          />
          {i < files.length - 1 && <Text> </Text>}
        </Box>
      ))}
    </>
  );
};

export const DiffView = ({
  patch,
  oldFile,
  newFile,
  showLineNumbers,
  contextLines,
  maxLines,
  ...boxProps
}: DiffViewProps) => {
  return (
    <DiffRoot patch={patch} oldFile={oldFile} newFile={newFile} {...boxProps}>
      <DiffViewInner
        showLineNumbers={showLineNumbers}
        contextLines={contextLines}
        maxLines={maxLines}
      />
    </DiffRoot>
  );
};

DiffView.displayName = "DiffView";
