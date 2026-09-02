import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type RepoSourceSnapshot = Record<string, string>;

// Matches the generator's bound. Reading the tree unbounded keeps a descriptor
// open per file and exhausts a 1024 descriptor limit well before the tree ends.
const READ_CONCURRENCY = 32;

// A dot directory keeps this verbatim copy of the monorepo out of the wildcard
// globs that scan the app for sources: TypeScript's include, vitest's test
// discovery, and the bundler's module rules all skip dotted directories.
export function repoSourceRoot() {
  return path.join(process.cwd(), "generated", ".repo-source");
}

export async function loadRepoSourceSnapshot(
  sourceRoot = repoSourceRoot(),
): Promise<RepoSourceSnapshot> {
  const filePaths = await listFiles(sourceRoot, "");
  const snapshot: RepoSourceSnapshot = {};
  let index = 0;

  async function worker() {
    while (index < filePaths.length) {
      const relativePath = filePaths[index++]!;
      snapshot[relativePath] = await readFile(
        path.join(sourceRoot, relativePath),
        "utf-8",
      );
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(READ_CONCURRENCY, filePaths.length) }, () =>
      worker(),
    ),
  );

  return snapshot;
}

async function listFiles(directory: string, prefix: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const filePaths: string[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      filePaths.push(
        ...(await listFiles(path.join(directory, entry.name), relativePath)),
      );
      continue;
    }

    filePaths.push(relativePath);
  }

  return filePaths;
}
