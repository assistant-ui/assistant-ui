import { type ComponentProps, type ReactNode, Fragment } from "react";
import { Box, Text } from "ink";
import { useMemo } from "react";
import { useDiffContext } from "./DiffContext";
import { DiffLine } from "./DiffLine";
import { foldContext } from "./diff-utils";
import type { ParsedLine, DisplayLine, FoldedRegion } from "./types";

export type DiffContentProps = ComponentProps<typeof Box> & {
  fileIndex?: number | undefined;
  showLineNumbers?: boolean | undefined;
  contextLines?: number | undefined;
  maxLines?: number | undefined;
  renderLine?:
    | ((props: { line: ParsedLine; index: number }) => ReactNode)
    | undefined;
  renderFold?:
    | ((props: { region: FoldedRegion; index: number }) => ReactNode)
    | undefined;
};

export const DiffContent = ({
  fileIndex = 0,
  showLineNumbers = true,
  contextLines,
  maxLines,
  renderLine,
  renderFold,
  ...boxProps
}: DiffContentProps) => {
  const { files } = useDiffContext();
  const file = files[fileIndex];

  const displayLines: DisplayLine[] = useMemo(() => {
    if (!file) return [];
    if (contextLines !== undefined) {
      return foldContext(file.lines, contextLines);
    }
    return file.lines;
  }, [file, contextLines]);

  if (!file) return null;

  const truncated = maxLines !== undefined && displayLines.length > maxLines;
  const visibleLines = truncated
    ? displayLines.slice(0, maxLines)
    : displayLines;
  const remainingCount = truncated ? displayLines.length - maxLines! : 0;

  return (
    <Box flexDirection="column" {...boxProps}>
      {visibleLines.map((line, i) => {
        if (line.type === "fold") {
          if (renderFold) {
            return (
              <Fragment key={i}>
                {renderFold({ region: line, index: i })}
              </Fragment>
            );
          }
          return (
            <Text key={i}>{`  --- ${line.hiddenCount} lines hidden ---`}</Text>
          );
        }
        if (renderLine) {
          return <Fragment key={i}>{renderLine({ line, index: i })}</Fragment>;
        }
        return (
          <DiffLine key={i} line={line} showLineNumbers={showLineNumbers} />
        );
      })}
      {truncated && <Text>{`... (${remainingCount} more lines)`}</Text>}
    </Box>
  );
};

DiffContent.displayName = "DiffPrimitive.Content";
