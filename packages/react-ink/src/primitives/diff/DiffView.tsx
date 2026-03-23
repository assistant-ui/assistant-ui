import { type ComponentProps, useMemo } from "react";
import { Box, Text } from "ink";
import { DiffContent } from "./DiffContent";
import { useDiffContext } from "./DiffContext";
import { DiffHeader } from "./DiffHeader";
import { DiffRoot } from "./DiffRoot";
import { computeDiff, parsePatch } from "./diff-utils";
import type { DiffFileInput, ParsedFile } from "./types";

export type DiffViewProps = Omit<ComponentProps<typeof Box>, "children"> & {
  patch?: string | undefined;
  oldFile?: DiffFileInput | undefined;
  newFile?: DiffFileInput | undefined;
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

const getDiffViewFiles = ({
  patch,
  oldFile,
  newFile,
}: {
  patch?: string | undefined;
  oldFile?: DiffFileInput | undefined;
  newFile?: DiffFileInput | undefined;
}): ParsedFile[] => {
  if (patch) {
    return parsePatch(patch);
  }

  if (!oldFile || !newFile) {
    return [];
  }

  const { lines, additions, deletions } = computeDiff(
    oldFile.content,
    newFile.content,
  );

  return [
    {
      oldName: oldFile.name,
      newName: newFile.name,
      lines,
      additions,
      deletions,
    },
  ];
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
  const oldContent = oldFile?.content;
  const oldName = oldFile?.name;
  const newContent = newFile?.content;
  const newName = newFile?.name;

  const files = useMemo(
    () =>
      getDiffViewFiles({
        patch,
        oldFile:
          oldContent !== undefined
            ? { content: oldContent, name: oldName }
            : undefined,
        newFile:
          newContent !== undefined
            ? { content: newContent, name: newName }
            : undefined,
      }),
    [patch, oldContent, oldName, newContent, newName],
  );

  return (
    <DiffRoot files={files} {...boxProps}>
      <DiffViewInner
        showLineNumbers={showLineNumbers}
        contextLines={contextLines}
        maxLines={maxLines}
      />
    </DiffRoot>
  );
};
