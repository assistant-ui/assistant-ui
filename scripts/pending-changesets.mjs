import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ignoredFiles = new Set(["AGENTS.md", "CLAUDE.md", "GEMINI.md"]);

const isChangeset = (file) =>
  !file.startsWith(".") &&
  file.endsWith(".md") &&
  !/^README\.md$/i.test(file) &&
  !ignoredFiles.has(file);

const changesetsIn = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter(isChangeset) : [];

// Counts changesets the way changesets/action's readChangesetState does, so the
// release dispatch fires on the same pushes its has-changesets output reported.
export function pendingChangesets(root = process.cwd()) {
  const dir = path.join(root, ".changeset");
  const prePath = path.join(dir, "pre.json");
  const preState = existsSync(prePath)
    ? JSON.parse(readFileSync(prePath, "utf8"))
    : undefined;
  return [
    ...changesetsIn(dir),
    ...(preState?.mode === "pre"
      ? []
      : changesetsIn(path.join(dir, "pre")).map((file) => `pre/${file}`)),
  ];
}
