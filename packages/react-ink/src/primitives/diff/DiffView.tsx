import { type ComponentProps, useMemo } from "react";
import { Box, Text } from "ink";
import { DiffContent } from "./DiffContent";
import { useDiffContext } from "./DiffContext";
import { DiffRoot } from "./DiffRoot";
import { computeDiff, parsePatch } from "./diff-utils";
import type {
  DiffFileInput,
  FoldedRegion,
  ParsedFile,
  ParsedLine,
} from "./types";

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

const INDICATOR: Record<string, string> = {
  add: "+",
  del: "-",
  normal: " ",
};

const isDevNull = (n: string | undefined) => !n || n === "/dev/null";

const StyledLine = ({
  line,
  showLineNumbers,
}: {
  line: ParsedLine;
  showLineNumbers: boolean;
}) => {
  const lineNum =
    line.type === "del"
      ? line.oldLineNumber
      : line.type === "add"
        ? line.newLineNumber
        : line.oldLineNumber;
  const numStr = lineNum !== undefined ? String(lineNum) : "";
  const padded = numStr.padStart(4);
  const content = `${INDICATOR[line.type]} ${line.content}`;

  return (
    <Box>
      {showLineNumbers && <Text dimColor>{padded} </Text>}
      {line.type === "add" ? (
        <Text color="green">{content}</Text>
      ) : line.type === "del" ? (
        <Text color="red">{content}</Text>
      ) : (
        <Text>{content}</Text>
      )}
    </Box>
  );
};

const StyledFold = ({ region }: { region: FoldedRegion }) => (
  <Text dimColor>{`  --- ${region.hiddenCount} lines hidden ---`}</Text>
);

const DiffViewInner = ({
  showLineNumbers,
  contextLines,
  maxLines,
}: DiffViewInnerProps) => {
  const { files } = useDiffContext();
  const shouldShowLineNumbers = showLineNumbers ?? true;

  if (files.length === 0) {
    return <Text dimColor>No diff content</Text>;
  }

  return (
    <>
      {files.map((file, i) => {
        const renamed =
          !isDevNull(file.oldName) &&
          !isDevNull(file.newName) &&
          file.oldName !== file.newName;
        const displayName = isDevNull(file.newName)
          ? file.oldName
          : file.newName;

        return (
          <Box key={i} flexDirection="column">
            <Box gap={1}>
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
            <DiffContent
              fileIndex={i}
              contextLines={contextLines}
              maxLines={maxLines}
              renderLine={({ line }) => (
                <StyledLine
                  line={line}
                  showLineNumbers={shouldShowLineNumbers}
                />
              )}
              renderFold={({ region }) => <StyledFold region={region} />}
            />
            {i < files.length - 1 && <Text> </Text>}
          </Box>
        );
      })}
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
