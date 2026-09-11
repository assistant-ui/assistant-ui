import type { LearnFileChange, LearnStageChanges } from "./types";
import type { LearnStageFiles } from "./stage-source";

export function compareStageFiles(
  previousFiles: LearnStageFiles,
  currentFiles: LearnStageFiles,
): LearnStageChanges {
  const paths = new Set([
    ...Object.keys(previousFiles),
    ...Object.keys(currentFiles),
  ]);
  const files: LearnFileChange[] = [];

  for (const path of [...paths].sort()) {
    const previous = previousFiles[path];
    const current = currentFiles[path];

    if (previous === undefined && current !== undefined) {
      files.push({
        path,
        status: "added",
        additions: splitLines(current).length,
        deletions: 0,
      });
      continue;
    }

    if (previous !== undefined && current === undefined) {
      files.push({
        path,
        status: "deleted",
        additions: 0,
        deletions: splitLines(previous).length,
      });
      continue;
    }

    if (
      previous === current ||
      previous === undefined ||
      current === undefined
    ) {
      continue;
    }

    const { additions, deletions } = compareLines(previous, current);
    files.push({
      path,
      status: "modified",
      additions,
      deletions,
    });
  }

  return {
    files,
    additions: files.reduce((sum, file) => sum + file.additions, 0),
    deletions: files.reduce((sum, file) => sum + file.deletions, 0),
  };
}

function compareLines(previous: string, current: string) {
  const previousLines = splitLines(previous);
  const currentLines = splitLines(current);
  const longestCommonSubsequence = lcsLength(previousLines, currentLines);

  return {
    additions: currentLines.length - longestCommonSubsequence,
    deletions: previousLines.length - longestCommonSubsequence,
  };
}

function splitLines(contents: string) {
  if (!contents) return [];
  const withoutFinalNewline = contents.endsWith("\n")
    ? contents.slice(0, -1)
    : contents;
  return withoutFinalNewline.split("\n");
}

function lcsLength(previous: string[], current: string[]) {
  let row = new Array<number>(current.length + 1).fill(0);

  for (const previousLine of previous) {
    const nextRow = new Array<number>(current.length + 1).fill(0);
    for (let index = 1; index <= current.length; index += 1) {
      nextRow[index] =
        previousLine === current[index - 1]
          ? row[index - 1]! + 1
          : Math.max(row[index]!, nextRow[index - 1]!);
    }
    row = nextRow;
  }

  return row[current.length]!;
}
