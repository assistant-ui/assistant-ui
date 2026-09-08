import {
  createRepoSourceReader,
  snapshotSourceReader,
  type RepoSourceReader,
} from "@/lib/repo-source";
import { createZip } from "../demo-downloads/zip";
import { getLearnCourse, getLearnStage } from "./registry";
import type { LearnCourseDefinition } from "./types";

export type LearnSourceSnapshot = Record<string, string>;
export type LearnStageFiles = Record<string, string>;

export async function resolveStageFiles(
  courseId: string,
  stageId: string,
): Promise<LearnStageFiles> {
  return resolveStageFilesFromReader(
    courseId,
    stageId,
    createRepoSourceReader(),
  );
}

export async function createLearnStageZip(courseId: string, stageId: string) {
  return createZip(await resolveStageFiles(courseId, stageId));
}

export async function createLearnStageZipFromSnapshot(
  courseId: string,
  stageId: string,
  snapshot: LearnSourceSnapshot,
) {
  return createZip(
    await resolveStageFilesFromSnapshot(courseId, stageId, snapshot),
  );
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
): Promise<LearnStageFiles> {
  return resolveStageFilesFromReader(
    courseId,
    stageId,
    snapshotSourceReader(snapshot),
  );
}

export async function resolveStageFilesFromReader(
  courseId: string,
  stageId: string,
  reader: RepoSourceReader,
): Promise<LearnStageFiles> {
  const course = getLearnCourse(courseId);
  return resolveStage(course, stageId, reader, new Set());
}

async function resolveStage(
  course: LearnCourseDefinition,
  stageId: string,
  reader: RepoSourceReader,
  resolvingStageIds: Set<string>,
): Promise<LearnStageFiles> {
  const stage = getLearnStage(course.id, stageId);
  if (resolvingStageIds.has(stageId)) {
    throw new Error(`Cyclic Learn stage inheritance: ${course.id}/${stageId}`);
  }

  resolvingStageIds.add(stageId);
  const sourceRoot = normalizeSourceRoot(stage.sourceRoot);
  const files: LearnStageFiles = stage.previousStageId
    ? await resolveStage(
        course,
        stage.previousStageId,
        reader,
        resolvingStageIds,
      )
    : await resolveSharedFiles(course.sharedFiles, reader);

  Object.assign(files, await resolveSharedFiles(stage.sharedFiles, reader));

  const stageFiles = await reader.readUnder(sourceRoot);
  const relativePaths = Object.keys(stageFiles).sort();

  if (relativePaths.length === 0) {
    throw new Error(
      `No source snapshot files found for Learn stage: ${course.id}/${stageId}`,
    );
  }

  for (const relativePath of relativePaths) {
    files[relativePath] = normalizePreviewImports(
      stageFiles[relativePath]!,
      relativePath,
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

async function resolveSharedFiles(
  sharedFiles: Record<string, string> | undefined,
  reader: RepoSourceReader,
): Promise<LearnStageFiles> {
  const entries = Object.entries(sharedFiles ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([outputPath, snapshotPath]) =>
        [normalizeOutputPath(outputPath), snapshotPath] as const,
    );
  const sources = await reader.readFiles(
    entries.map(([, snapshotPath]) => snapshotPath),
  );
  const files: LearnStageFiles = {};

  entries.forEach(([outputPath, snapshotPath], index) => {
    const source = sources[index];
    if (source === undefined) {
      throw new Error(
        `Missing shared Learn source snapshot file: ${snapshotPath}`,
      );
    }
    files[outputPath] = source;
  });

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
