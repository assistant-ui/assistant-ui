import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type RepoSourceSnapshot = Record<string, string>;

// Matches the generator's bound. Reading the tree unbounded keeps a descriptor
// open per file and exhausts a 1024 descriptor limit well before the tree ends.
const READ_CONCURRENCY = 32;

// A dot directory keeps this verbatim copy of the monorepo out of TypeScript's
// include and the bundler's module rules, which both skip dotted directories.
// Vitest discovers them, so it needs the explicit exclude in vitest.config.ts.
export function repoSourceRoot() {
  return path.join(process.cwd(), "generated", ".repo-source");
}

export async function loadRepoSourceSnapshot(
  sourceRoot = repoSourceRoot(),
): Promise<RepoSourceSnapshot> {
  const filePaths = await listFiles(sourceRoot);
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

// Level by level rather than depth first: a recursive walk serializes every
// readdir in the tree behind its predecessor, which costs more than the reads.
async function listFiles(sourceRoot: string): Promise<string[]> {
  const filePaths: string[] = [];
  let level = [{ directory: sourceRoot, prefix: "" }];

  while (level.length > 0) {
    const nextLevel: typeof level = [];

    for (let start = 0; start < level.length; start += READ_CONCURRENCY) {
      const batch = level.slice(start, start + READ_CONCURRENCY);
      const listings = await Promise.all(
        batch.map(({ directory }) =>
          readdir(directory, { withFileTypes: true }),
        ),
      );

      listings.forEach((entries, index) => {
        const { directory, prefix } = batch[index]!;

        for (const entry of entries) {
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

          if (entry.isDirectory()) {
            nextLevel.push({
              directory: path.join(directory, entry.name),
              prefix: relativePath,
            });
            continue;
          }

          filePaths.push(relativePath);
        }
      });
    }

    level = nextLevel;
  }

  return filePaths;
}
