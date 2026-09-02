import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type RepoSourceSnapshot = Record<string, string>;

// A dot directory keeps this verbatim copy of the monorepo out of the wildcard
// globs that scan the app for sources: TypeScript's include, vitest's test
// discovery, and the bundler's module rules all skip dotted directories.
export function repoSourceRoot() {
  return path.join(process.cwd(), "generated", ".repo-source");
}

export async function loadRepoSourceSnapshot(
  sourceRoot = repoSourceRoot(),
): Promise<RepoSourceSnapshot> {
  const snapshot: RepoSourceSnapshot = {};
  await collectInto(snapshot, sourceRoot, "");
  return snapshot;
}

async function collectInto(
  snapshot: RepoSourceSnapshot,
  directory: string,
  prefix: string,
) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await collectInto(snapshot, entryPath, relativePath);
        return;
      }

      snapshot[relativePath] = await readFile(entryPath, "utf-8");
    }),
  );
}
