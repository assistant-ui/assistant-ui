import { readdir, stat } from "fs/promises";
import { join, extname } from "path";
import { DOCS_PATH, MDX_EXTENSION, MD_EXTENSION } from "../constants.js";
import { logger } from "./logger.js";

const SIMILARITY_THRESHOLDS = {
  EXACT_MATCH: 1,
  CONTAINS_MATCH: 0.8,
  PARTIAL_MATCH: 0.5,
  MIN_SUGGESTION: 0.3,
} as const;

export async function listDirContents(dirPath: string): Promise<{
  directories: string[];
  files: string[];
}> {
  try {
    const items = await readdir(dirPath, { withFileTypes: true });

    const directories = items
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .filter((name) => !name.startsWith("."))
      .sort();

    const files = items
      .filter(
        (item) =>
          item.isFile() &&
          (extname(item.name) === MDX_EXTENSION ||
            extname(item.name) === MD_EXTENSION),
      )
      .map((item) => item.name)
      .sort();

    return { directories, files };
  } catch (error) {
    logger.error(`Failed to list directory contents: ${dirPath}`, error);
    return { directories: [], files: [] };
  }
}

export async function getAvailablePaths(): Promise<string[]> {
  const paths: string[] = [];

  async function scanDirectory(
    dir: string,
    prefix: string = "",
  ): Promise<void> {
    const { directories, files } = await listDirContents(dir);

    for (const file of files) {
      const name = file.replace(MDX_EXTENSION, "").replace(MD_EXTENSION, "");
      paths.push(prefix ? `${prefix}/${name}` : name);
    }

    for (const subdir of directories) {
      const subdirPath = join(dir, subdir);
      const newPrefix = prefix ? `${prefix}/${subdir}` : subdir;
      paths.push(newPrefix);
      await scanDirectory(subdirPath, newPrefix);
    }
  }

  await scanDirectory(DOCS_PATH);
  return paths.sort();
}

export function findNearestPaths(
  requestedPath: string,
  availablePaths: string[],
): string[] {
  const normalizedRequest = requestedPath
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const scored = availablePaths.map((path) => {
    const normalizedPath = path.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (normalizedPath.includes(normalizedRequest)) {
      return { path, score: SIMILARITY_THRESHOLDS.EXACT_MATCH };
    }

    if (normalizedRequest.includes(normalizedPath)) {
      return { path, score: SIMILARITY_THRESHOLDS.CONTAINS_MATCH };
    }

    const overlap = [...normalizedRequest].filter((char) =>
      normalizedPath.includes(char),
    ).length;

    return {
      path,
      score:
        (overlap / normalizedRequest.length) *
        SIMILARITY_THRESHOLDS.PARTIAL_MATCH,
    };
  });

  return scored
    .filter((item) => item.score > SIMILARITY_THRESHOLDS.MIN_SUGGESTION)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.path);
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
