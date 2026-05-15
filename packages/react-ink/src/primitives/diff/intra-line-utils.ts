import { diffWordsWithSpace } from "diff";
import type { ParsedLine } from "./types";

export type StyledDiffSegment = {
  text: string;
  changed: boolean;
};

const getRunEnd = (
  lines: ParsedLine[],
  startIndex: number,
  type: "add" | "del",
) => {
  let index = startIndex;
  while (lines[index]?.type === type) {
    index++;
  }
  return index;
};

export const buildLinePairMap = (lines: ParsedLine[]) => {
  const pairMap = new Map<ParsedLine, ParsedLine>();

  for (let index = 0; index < lines.length; index++) {
    if (lines[index]?.type !== "del") {
      continue;
    }

    const delRunEnd = getRunEnd(lines, index, "del");
    const addRunEnd = getRunEnd(lines, delRunEnd, "add");
    const runLength = delRunEnd - index;

    if (runLength > 0 && runLength === addRunEnd - delRunEnd) {
      for (let offset = 0; offset < runLength; offset++) {
        pairMap.set(lines[index + offset]!, lines[delRunEnd + offset]!);
      }
      index = addRunEnd - 1;
      continue;
    }

    index = delRunEnd - 1;
  }

  return pairMap;
};

export const buildIntraLineSegments = (
  delText: string,
  addText: string,
): {
  delSegments: StyledDiffSegment[];
  addSegments: StyledDiffSegment[];
} => {
  const delSegments: StyledDiffSegment[] = [];
  const addSegments: StyledDiffSegment[] = [];

  for (const part of diffWordsWithSpace(delText, addText)) {
    if (!part.added) {
      delSegments.push({
        text: part.value,
        changed: Boolean(part.removed),
      });
    }

    if (!part.removed) {
      addSegments.push({
        text: part.value,
        changed: Boolean(part.added),
      });
    }
  }

  return {
    delSegments,
    addSegments,
  };
};
