#!/usr/bin/env node
import { globSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const BUMP_LINE =
  /^(?:"([^"]+)"|'([^']+)'|([^\s'":][^:]*?))\s*:\s*(patch|minor|major)\s*$/;

function readWorkspaceGlobs() {
  const source = readFileSync(
    path.join(repoRoot, "pnpm-workspace.yaml"),
    "utf8",
  );
  const globs = [];
  let inPackages = false;
  for (const line of source.split("\n")) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    const entry = line.match(/^\s+-\s*(?:"([^"]+)"|'([^']+)'|(\S+))\s*$/);
    if (!entry) break;
    globs.push(entry[1] ?? entry[2] ?? entry[3]);
  }
  if (globs.length === 0) {
    throw new Error("pnpm-workspace.yaml declares no `packages:` entries.");
  }
  return globs;
}

function readWorkspacePackages() {
  const byName = new Map();
  for (const glob of readWorkspaceGlobs()) {
    for (const manifest of globSync(`${glob}/package.json`, {
      cwd: repoRoot,
    })) {
      const pkg = readJson(path.join(repoRoot, manifest));
      if (typeof pkg.name !== "string") continue;
      byName.set(pkg.name, {
        manifest: manifest.replaceAll("\\", "/"),
        isPrivate: pkg.private === true,
      });
    }
  }
  return byName;
}

function readChangesetBumps() {
  const changesetDir = path.join(repoRoot, ".changeset");
  const bumps = [];
  for (const file of readdirSync(changesetDir).sort()) {
    if (!file.endsWith(".md") || file === "README.md") continue;
    const frontmatter = readFileSync(
      path.join(changesetDir, file),
      "utf8",
    ).match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) continue;
    for (const line of frontmatter[1].split("\n")) {
      const bump = line.trim().match(BUMP_LINE);
      if (!bump) continue;
      bumps.push({ file, name: bump[1] ?? bump[2] ?? bump[3] });
    }
  }
  return bumps;
}

const packages = readWorkspacePackages();
const problems = [];

for (const { file, name } of readChangesetBumps()) {
  const pkg = packages.get(name);
  if (!pkg) {
    problems.push({
      file,
      name,
      reason: "is not a workspace package (misspelled or renamed?)",
    });
  } else if (pkg.isPrivate) {
    problems.push({
      file,
      name,
      reason: `is private (${pkg.manifest}) and is never versioned`,
    });
  }
}

if (problems.length > 0) {
  console.error("Changesets name packages that cannot be released:\n");
  for (const { file, name, reason } of problems) {
    console.error(`  .changeset/${file}: "${name}" ${reason}`);
  }
  console.error(
    "\n`privatePackages.version` is false, so changesets skips private packages.",
  );
  console.error(
    "A changeset mixing a skipped package with a released one aborts `changeset version`,",
  );
  console.error("which blocks every release until the line is removed.");
  console.error("\nDrop the offending line from the changeset frontmatter.");
  process.exit(1);
}

console.log(
  `All changeset bumps name releasable workspace packages. (${packages.size} packages scanned)`,
);
