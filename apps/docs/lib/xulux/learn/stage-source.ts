import { loadSourceSnapshot } from "../demo-downloads/create-demo-zip";
import { getLearnCourse, getLearnStage } from "./registry";

export type LearnSourceSnapshot = Record<string, string>;
export type LearnStageFiles = Record<string, string>;

export async function resolveStageFiles(
  courseId: string,
  stageId: string,
): Promise<LearnStageFiles> {
  return resolveStageFilesFromSnapshot(
    courseId,
    stageId,
    await loadSourceSnapshot(),
  );
}

export function resolveStageFilesFromSnapshot(
  courseId: string,
  stageId: string,
  snapshot: LearnSourceSnapshot,
): LearnStageFiles {
  const course = getLearnCourse(courseId);
  const stage = getLearnStage(courseId, stageId);
  const sourceRoot = normalizeSourceRoot(stage.sourceRoot);
  const sourcePrefix = `${sourceRoot}/`;
  const files: LearnStageFiles = {
    ...resolveSharedFiles(course.sharedFiles, snapshot),
    ...resolveSharedFiles(stage.sharedFiles, snapshot),
  };
  let stageFileCount = 0;

  for (const snapshotPath of Object.keys(snapshot).sort()) {
    if (!snapshotPath.startsWith(sourcePrefix)) continue;
    const relativePath = snapshotPath.slice(sourcePrefix.length);
    if (!relativePath || relativePath.startsWith("../")) continue;
    files[relativePath] = snapshot[snapshotPath]!;
    stageFileCount += 1;
  }

  if (stageFileCount === 0) {
    throw new Error(
      `No source snapshot files found for Learn stage: ${courseId}/${stageId}`,
    );
  }

  return files;
}

function resolveSharedFiles(
  sharedFiles: Record<string, string> | undefined,
  snapshot: LearnSourceSnapshot,
): LearnStageFiles {
  const files: LearnStageFiles = {};

  for (const [outputPath, snapshotPath] of Object.entries(
    sharedFiles ?? {},
  ).sort(([left], [right]) => left.localeCompare(right))) {
    const normalizedOutputPath = normalizeOutputPath(outputPath);
    const source = snapshot[snapshotPath];
    if (source === undefined) {
      throw new Error(
        `Missing shared Learn source snapshot file: ${snapshotPath}`,
      );
    }
    files[normalizedOutputPath] = source;
  }

  return files;
}

function normalizeOutputPath(outputPath: string) {
  const normalized = outputPath.replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Unsafe shared Learn output path: ${outputPath}`);
  }
  return normalized;
}

function normalizeSourceRoot(sourceRoot: string) {
  const normalized = sourceRoot.replaceAll("\\", "/").replace(/\/+$/, "");
  if (
    normalized.startsWith("/") ||
    normalized.includes("../") ||
    !normalized.endsWith("/project")
  ) {
    throw new Error(`Unsafe Learn stage source root: ${sourceRoot}`);
  }
  return normalized;
}
