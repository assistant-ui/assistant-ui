#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { diffApiSurface } from "./diff-api-surface.mjs";
import { parseBumpLine, readChangesetSource } from "./lib/changesets.mjs";
import { isExecutedAsMain } from "./lib/main.mjs";
import { apiSurfaceFileName } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const INTENDED_MARKER =
  /^\s*(?:<!--\s*)?caret-break:\s*intended\s*(?:-->)?\s*$/m;

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function atRevision(root, revision, file) {
  try {
    return git(root, ["show", `${revision}:${file}`]);
  } catch (error) {
    if (
      error.stderr?.includes("does not exist in") ||
      error.stderr?.includes("exists on disk, but not in")
    )
      return null;
    throw error;
  }
}

export function intendedChangesetPackages(source) {
  const changeset = readChangesetSource(source);
  if (!changeset || !INTENDED_MARKER.test(changeset.body)) return [];
  return changeset.frontmatter.split("\n").flatMap((line) => {
    const release = parseBumpLine(line);
    return release ? [release.name] : [];
  });
}

export function removedSurfaceNames(baseText, headText) {
  const diff = diffApiSurface(baseText, headText);
  return Object.entries(diff.exportsRemoved)
    .flatMap(([entry, names]) => names.map((name) => ({ entry, name })))
    .sort(
      (a, b) => a.entry.localeCompare(b.entry) || a.name.localeCompare(b.name),
    );
}

export function runCheck(
  root = repoRoot,
  baseSha = process.env.BASE_SHA,
  headSha = process.env.HEAD_SHA,
) {
  if (!baseSha || !headSha)
    throw new Error("BASE_SHA and HEAD_SHA are required.");
  git(root, ["rev-parse", "--verify", `${baseSha}^{tree}`]);
  git(root, ["rev-parse", "--verify", `${headSha}^{tree}`]);
  const changedChangesets = git(root, [
    "diff",
    "--name-only",
    "--diff-filter=A",
    baseSha,
    headSha,
    "--",
    ".changeset",
  ])
    .trim()
    .split("\n")
    .filter((file) => /^\.changeset\/[^/]+\.md$/.test(file));
  const allowed = new Set(
    changedChangesets.flatMap((file) =>
      intendedChangesetPackages(atRevision(root, headSha, file) ?? ""),
    ),
  );
  const manifests = git(root, [
    "ls-tree",
    "-r",
    "--name-only",
    headSha,
    "--",
    "packages",
  ])
    .trim()
    .split("\n")
    .filter((file) => /^packages\/[^/]+\/package\.json$/.test(file));
  const failures = [];
  for (const manifest of manifests) {
    const pkg = JSON.parse(atRevision(root, headSha, manifest));
    if (pkg.private || !pkg.name) continue;
    const snapshot = `api-surface/${apiSurfaceFileName(pkg.name)}`;
    const before = atRevision(root, baseSha, snapshot);
    const after = atRevision(root, headSha, snapshot);
    if (before === null) continue;
    if (allowed.has(pkg.name)) continue;
    for (const { entry, name } of removedSurfaceNames(before, after)) {
      failures.push({ package: pkg.name, entry, name });
    }
  }
  return failures;
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  try {
    const failures = runCheck(process.argv[2] ?? repoRoot);
    if (failures.length) {
      for (const { package: pkg, entry, name } of failures)
        console.error(`${pkg} ${entry}: removed export ${name}`);
      console.error(
        "Add a changeset for each affected package with <!-- caret-break: intended --> to acknowledge the removal.",
      );
      process.exitCode = 1;
    } else console.log("No unacknowledged public surface removals.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
