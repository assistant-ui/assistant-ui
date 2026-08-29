#!/usr/bin/env node
import { globSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const BUMP_VALUES = new Set(["patch", "minor", "major"]);

export function parseWorkspaceGlobs(source) {
  const globs = [];
  let inPackages = false;
  for (const line of source.split("\n")) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    if (/^\s*(?:#.*)?$/.test(line)) continue;
    const entry = line.match(
      /^\s+-\s*(?:"([^"]*)"|'([^']*)'|([^\s#]+))\s*(?:#.*)?$/,
    );
    if (!entry) break;
    globs.push(entry[1] ?? entry[2] ?? entry[3]);
  }
  return globs;
}

export function parseBumpLine(line) {
  const entry = line
    .trim()
    .match(/^(?:"([^"]*)"|'([^']*)'|([^#:][^:]*?))\s*:\s*(.*)$/);
  if (!entry) return null;
  const value = entry[4].match(
    /^(?:"([^"]*)"|'([^']*)'|([^\s#]*))\s*(?:#.*)?$/,
  );
  if (!value) return null;
  const bump = value[1] ?? value[2] ?? value[3];
  if (!BUMP_VALUES.has(bump)) return null;
  return { name: entry[1] ?? entry[2] ?? entry[3], bump };
}

function readWorkspacePackages() {
  const globs = parseWorkspaceGlobs(
    readFileSync(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8"),
  );
  if (globs.length === 0) {
    throw new Error("pnpm-workspace.yaml declares no `packages:` entries.");
  }
  const byName = new Map();
  for (const glob of globs) {
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
      const bump = parseBumpLine(line);
      if (bump) bumps.push({ file, name: bump.name });
    }
  }
  return bumps;
}

export function findUnreleasablePackages(packages, bumps) {
  const problems = [];
  for (const { file, name } of bumps) {
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
  return problems;
}

function main() {
  const packages = readWorkspacePackages();
  const problems = findUnreleasablePackages(packages, readChangesetBumps());

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
}

if (import.meta.main) main();
