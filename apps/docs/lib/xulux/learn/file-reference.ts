import { compareStageFiles } from "./stage-diff";
import type { LearnStageFiles } from "./stage-source";
import type { LearnFileChangeStatus } from "./types";

const FILE_REFERENCE_PREFIX = "xulux-file:";

export type XuluxFileReference = {
  scope: "course";
  path: string;
};

export type LearnFileRecord = {
  path: string;
  status: LearnFileChangeStatus | "unchanged";
  previousContent: string | undefined;
  currentContent: string | undefined;
  additions: number;
  deletions: number;
};

export function parseXuluxFileReference(
  value: string,
): XuluxFileReference | null {
  if (!value.startsWith(FILE_REFERENCE_PREFIX)) return null;

  const separator = value.indexOf(":", FILE_REFERENCE_PREFIX.length);
  if (separator === -1) return null;

  const scope = value.slice(FILE_REFERENCE_PREFIX.length, separator);
  const path = value.slice(separator + 1);

  if (scope !== "course" || !isSafeRelativePath(path)) return null;
  return { scope, path };
}

export function createLearnFileRecords(
  previousFiles: LearnStageFiles,
  currentFiles: LearnStageFiles,
): ReadonlyMap<string, LearnFileRecord> {
  const changes = compareStageFiles(previousFiles, currentFiles);
  const changesByPath = new Map(
    changes.files.map((change) => [change.path, change]),
  );
  const paths = new Set([
    ...Object.keys(previousFiles),
    ...Object.keys(currentFiles),
  ]);
  const records = new Map<string, LearnFileRecord>();

  for (const path of [...paths].sort()) {
    const change = changesByPath.get(path);
    records.set(path, {
      path,
      status: change?.status ?? "unchanged",
      previousContent: previousFiles[path],
      currentContent: currentFiles[path],
      additions: change?.additions ?? 0,
      deletions: change?.deletions ?? 0,
    });
  }

  return records;
}

function isSafeRelativePath(path: string) {
  if (
    path.length === 0 ||
    path !== path.trim() ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("\\") ||
    path.includes("?") ||
    path.includes("#") ||
    hasControlCharacter(path)
  ) {
    return false;
  }

  return path
    .split("/")
    .every(
      (segment) => segment.length > 0 && segment !== "." && segment !== "..",
    );
}

function hasControlCharacter(value: string) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint <= 31 || codePoint === 127;
  });
}
