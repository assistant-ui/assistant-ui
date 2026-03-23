import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import type { ParsedLine } from "./types";

const INDICATOR: Record<ParsedLine["type"], string> = {
  add: "+",
  del: "-",
  normal: " ",
};

export type DiffLineProps = ComponentProps<typeof Box> & {
  line: ParsedLine;
  showLineNumbers?: boolean;
  lineNumberWidth?: number;
};

export const DiffLine = ({
  line,
  showLineNumbers = true,
  lineNumberWidth = 4,
  ...boxProps
}: DiffLineProps) => {
  const lineNum =
    line.type === "del"
      ? line.oldLineNumber
      : line.type === "add"
        ? line.newLineNumber
        : line.oldLineNumber;

  const numStr = lineNum !== undefined ? String(lineNum) : "";
  const padded = numStr.padStart(lineNumberWidth);
  const content = `${INDICATOR[line.type]} ${line.content}`;

  return (
    <Box {...boxProps}>
      {showLineNumbers && <Text>{padded} </Text>}
      <Text>{content}</Text>
    </Box>
  );
};

DiffLine.displayName = "DiffPrimitive.Line";
