import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type RepoSourceSnapshot = Record<string, string>;

/**
 * Callers name the files they want rather than materializing the tree, so a
 * request costs the entries it references instead of every tracked file.
 */
export type RepoSourceReader = {
  readFile(filePath: string): Promise<string | undefined>;
  readUnder(prefix: string): Promise<Record<string, string>>;
};

// Matches the generator's bound. Reading the tree unbounded keeps a descriptor
// open per file and exhausts a 1024 descriptor limit well before the tree ends.
const READ_CONCURRENCY = 32;

// A dot directory keeps this verbatim copy of the monorepo out of TypeScript's
// include and the bundler's module rules, which both skip dotted directories.
// Vitest discovers them, so it needs the explicit exclude in vitest.config.ts.
export function repoSourceRoot() {
  return path.join(process.cwd(), "generated", ".repo-source");
}

export function createRepoSourceReader(
  sourceRoot = repoSourceRoot(),
): RepoSourceReader {
  return {
    async readFile(filePath) {
      try {
        return await readFile(resolveWithin(sourceRoot, filePath), "utf-8");
      } catch (error) {
        if (isMissing(error)) return undefined;
        throw error;
      }
    },

    async readUnder(prefix) {
      const directory = resolveWithin(sourceRoot, prefix);
      let relativePaths: string[];

      try {
        relativePaths = await listFiles(directory);
      } catch (error) {
        if (isMissing(error)) return {};
        throw error;
      }

      const files: Record<string, string> = {};
      let index = 0;

      async function worker() {
        while (index < relativePaths.length) {
          const relativePath = relativePaths[index++]!;
          files[relativePath] = await readFile(
            path.join(directory, relativePath),
            "utf-8",
          );
        }
      }

      await Promise.all(
        Array.from(
          { length: Math.min(READ_CONCURRENCY, relativePaths.length) },
          () => worker(),
        ),
      );

      return files;
    },
  };
}

export function snapshotSourceReader(
  snapshot: RepoSourceSnapshot,
): RepoSourceReader {
  return {
    async readFile(filePath) {
      return snapshot[filePath];
    },

    async readUnder(prefix) {
      const sourcePrefix = `${prefix}/`;
      const files: Record<string, string> = {};

      for (const snapshotPath of Object.keys(snapshot)) {
        if (!snapshotPath.startsWith(sourcePrefix)) continue;
        const relativePath = snapshotPath.slice(sourcePrefix.length);
        if (!relativePath) continue;
        files[relativePath] = snapshot[snapshotPath]!;
      }

      return files;
    },
  };
}

// The tree mirrors the monorepo on disk, so a path that climbs out of it would
// read the deployment rather than the snapshot.
function resolveWithin(sourceRoot: string, relativePath: string) {
  const normalized = path.posix.normalize(relativePath.replaceAll("\\", "/"));

  if (
    !relativePath ||
    normalized.startsWith("/") ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`Unsafe repo source path: ${relativePath}`);
  }

  return path.join(sourceRoot, normalized);
}

function isMissing(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
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
