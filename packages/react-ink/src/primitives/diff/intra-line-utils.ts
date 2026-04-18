import { diffWordsWithSpace } from "diff";
import type { ParsedLine } from "./types";

export type StyledDiffSegment = {
  text: string;
  changed: boolean;
};

export type PairInfo = {
  role: "del" | "add";
  counterpart: ParsedLine;
};

type LinePair = {
  del: ParsedLine;
  add: ParsedLine;
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

const pushPair = (pairMap: Map<ParsedLine, PairInfo>, pair: LinePair) => {
  pairMap.set(pair.del, { role: "del", counterpart: pair.add });
  pairMap.set(pair.add, { role: "add", counterpart: pair.del });
};

export const buildLinePairMap = (lines: ParsedLine[]) => {
  const pairMap = new Map<ParsedLine, PairInfo>();

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line?.type !== "del") {
      continue;
    }

    const delRunEnd = getRunEnd(lines, index, "del");
    const addRunEnd = getRunEnd(lines, delRunEnd, "add");
    const delRunLength = delRunEnd - index;
    const addRunLength = addRunEnd - delRunEnd;

    if (addRunLength > 0 && delRunLength === addRunLength) {
      for (let offset = 0; offset < delRunLength; offset++) {
        pushPair(pairMap, {
          del: lines[index + offset]!,
          add: lines[delRunEnd + offset]!,
        });
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
