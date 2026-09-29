import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type RepoSourceSnapshot = Record<string, string>;

/**
 * Callers name the files they want rather than materializing the tree, so a
 * request costs the entries it references instead of every tracked file.
 */
export type RepoSourceReader = {
  readFile(filePath: string): Promise<string | undefined>;
  readFiles(filePaths: readonly string[]): Promise<(string | undefined)[]>;
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
  const reader: RepoSourceReader = {
    async readFile(filePath) {
      try {
        return await readFile(resolveWithin(sourceRoot, filePath), "utf-8");
      } catch (error) {
        if (isMissing(error)) return undefined;
        throw error;
      }
    },

    async readFiles(filePaths) {
      return mapBounded(filePaths, (filePath) => reader.readFile(filePath));
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

      const contents = await mapBounded(relativePaths, (relativePath) =>
        readFile(path.join(directory, relativePath), "utf-8"),
      );
      const files: Record<string, string> = {};

      relativePaths.forEach((relativePath, index) => {
        files[relativePath] = contents[index]!;
      });

      return files;
    },
  };

  return reader;
}

export function snapshotSourceReader(
  snapshot: RepoSourceSnapshot,
): RepoSourceReader {
  const reader: RepoSourceReader = {
    async readFile(filePath) {
      return snapshot[normalizeSourcePath(filePath)];
    },

    async readFiles(filePaths) {
      return Promise.all(
        filePaths.map((filePath) => reader.readFile(filePath)),
      );
    },

    async readUnder(prefix) {
      const sourcePrefix = `${normalizeSourcePath(prefix)}/`;
      const files: Record<string, string> = {};

      for (const snapshotPath of Object.keys(snapshot)) {
        if (!snapshotPath.startsWith(sourcePrefix)) continue;
        const relativePath = snapshotPath.slice(sourcePrefix.length);
        if (!relativePath || relativePath.startsWith("../")) continue;
        files[relativePath] = snapshot[snapshotPath]!;
      }

      return files;
    },
  };

  return reader;
}

async function mapBounded<T, R>(
  items: readonly T[],
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await run(items[current]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(READ_CONCURRENCY, items.length) }, () =>
      worker(),
    ),
  );

  return results;
}

// The tree mirrors the monorepo on disk, so a path that climbs out of it would
// read the deployment rather than the snapshot.
function normalizeSourcePath(relativePath: string) {
  const normalized = path.posix
    .normalize(relativePath.replaceAll("\\", "/"))
    .replace(/\/+$/, "");

  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`Unsafe repo source path: ${relativePath}`);
  }

  return normalized;
}

function resolveWithin(sourceRoot: string, relativePath: string) {
  return path.join(sourceRoot, normalizeSourcePath(relativePath));
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
