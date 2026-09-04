import { loadRepoSourceSnapshot } from "@/lib/repo-source";
import { createZip } from "../demo-downloads/zip";
import { getLearnCourse, getLearnStage } from "./registry";
import type { LearnCourseDefinition } from "./types";

export type LearnSourceSnapshot = Record<string, string>;
export type LearnStageFiles = Record<string, string>;

export async function resolveStageFiles(
  courseId: string,
  stageId: string,
): Promise<LearnStageFiles> {
  return resolveStageFilesFromSnapshot(
    courseId,
    stageId,
    await loadRepoSourceSnapshot(),
  );
}

export async function createLearnStageZip(courseId: string, stageId: string) {
  return createZip(await resolveStageFiles(courseId, stageId));
}

export function createLearnStageZipFromSnapshot(
  courseId: string,
  stageId: string,
  snapshot: LearnSourceSnapshot,
) {
  return createZip(resolveStageFilesFromSnapshot(courseId, stageId, snapshot));
}

export function getLearnStageArchiveFilename(
  courseId: string,
  stageId: string,
) {
  getLearnCourse(courseId);
  getLearnStage(courseId, stageId);
  return `xulux-${courseId}-${stageId.toLowerCase()}.zip`;
}

export function resolveStageFilesFromSnapshot(
  courseId: string,
  stageId: string,
  snapshot: LearnSourceSnapshot,
): LearnStageFiles {
  const course = getLearnCourse(courseId);
  return resolveStage(course, stageId, snapshot, new Set());
}

function resolveStage(
  course: LearnCourseDefinition,
  stageId: string,
  snapshot: LearnSourceSnapshot,
  resolvingStageIds: Set<string>,
): LearnStageFiles {
  const stage = getLearnStage(course.id, stageId);
  if (resolvingStageIds.has(stageId)) {
    throw new Error(`Cyclic Learn stage inheritance: ${course.id}/${stageId}`);
  }

  resolvingStageIds.add(stageId);
  const sourceRoot = normalizeSourceRoot(stage.sourceRoot);
  const sourcePrefix = `${sourceRoot}/`;
  const files: LearnStageFiles = stage.previousStageId
    ? resolveStage(course, stage.previousStageId, snapshot, resolvingStageIds)
    : resolveSharedFiles(course.sharedFiles, snapshot);

  Object.assign(files, resolveSharedFiles(stage.sharedFiles, snapshot));
  let stageFileCount = 0;

  for (const snapshotPath of Object.keys(snapshot).sort()) {
    if (!snapshotPath.startsWith(sourcePrefix)) continue;
    const relativePath = snapshotPath.slice(sourcePrefix.length);
    if (!relativePath || relativePath.startsWith("../")) continue;
    files[relativePath] = normalizePreviewImports(
      snapshot[snapshotPath]!,
      relativePath,
    );
    stageFileCount += 1;
  }

  if (stageFileCount === 0) {
    throw new Error(
      `No source snapshot files found for Learn stage: ${course.id}/${stageId}`,
    );
  }

  resolvingStageIds.delete(stageId);
  return files;
}

const PREVIEW_STAGE_IMPORT =
  /@\/lib\/xulux\/learn\/courses\/[^"']+\/stages\/[^/"']+\/project\/([^"']+)/g;

function normalizePreviewImports(source: string, outputPath: string) {
  return source.replace(PREVIEW_STAGE_IMPORT, (_match, targetPath: string) =>
    relativeImport(outputPath, targetPath),
  );
}

function relativeImport(outputPath: string, targetPath: string) {
  const from = outputPath.split("/").slice(0, -1);
  const target = targetPath.split("/");

  while (from.length > 0 && target.length > 0 && from[0] === target[0]) {
    from.shift();
    target.shift();
  }

  const relative = [...from.map(() => ".."), ...target].join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
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
