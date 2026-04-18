import { type ComponentProps, useMemo } from "react";
import { Box, Text } from "ink";
import { DiffContent } from "./DiffContent";
import { useDiffContext } from "./DiffContext";
import { DiffRoot } from "./DiffRoot";
import { computeDiff, parsePatch } from "./diff-utils";
import {
  buildIntraLineSegments,
  buildLinePairMap,
  type StyledDiffSegment,
} from "./intra-line-utils";
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

const EMPTY_SEGMENT_MAP = new Map<ParsedLine, StyledDiffSegment[]>();

const isDevNull = (n: string | undefined) => !n || n === "/dev/null";

const buildSegmentMap = (lines: ParsedLine[]) => {
  const pairMap = buildLinePairMap(lines);
  const segmentMap = new Map<ParsedLine, StyledDiffSegment[]>();

  for (const [line, pairInfo] of pairMap) {
    if (pairInfo.role !== "del") {
      continue;
    }

    const { delSegments, addSegments } = buildIntraLineSegments(
      line.content,
      pairInfo.counterpart.content,
    );

    segmentMap.set(line, delSegments);
    segmentMap.set(pairInfo.counterpart, addSegments);
  }

  return segmentMap;
};

const renderSegmentedLine = (
  line: ParsedLine,
  segments: StyledDiffSegment[],
) => {
  const color = line.type === "add" ? "green" : "red";

  return (
    <Text color={color}>
      {`${INDICATOR[line.type]} `}
      {segments.map((segment, index) => (
        <Text
          key={`${line.type}-${index}`}
          bold={segment.changed}
          dimColor={!segment.changed}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
};

const StyledLine = ({
  line,
  showLineNumbers,
  segmentMap,
}: {
  line: ParsedLine;
  showLineNumbers: boolean;
  segmentMap: Map<ParsedLine, StyledDiffSegment[]>;
}) => {
  const lineNum =
    line.type === "del"
      ? line.oldLineNumber
      : line.type === "add"
        ? line.newLineNumber
        : line.oldLineNumber;
  const numStr = lineNum !== undefined ? String(lineNum) : "";
  const padded = numStr.padStart(4);
  const segments = segmentMap.get(line);

  return (
    <Box>
      {showLineNumbers && <Text dimColor>{padded} </Text>}
      {segments && line.type !== "normal" ? (
        renderSegmentedLine(line, segments)
      ) : line.type === "add" ? (
        <Text color="green">{`+ ${line.content}`}</Text>
      ) : line.type === "del" ? (
        <Text color="red">{`- ${line.content}`}</Text>
      ) : (
        <Text>{`  ${line.content}`}</Text>
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
  const segmentMaps = useMemo(
    () => files.map((file) => buildSegmentMap(file.lines)),
    [files],
  );

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
                  segmentMap={segmentMaps[i] ?? EMPTY_SEGMENT_MAP}
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
