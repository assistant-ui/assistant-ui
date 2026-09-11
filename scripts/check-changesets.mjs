#!/usr/bin/env node
import { globSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./check-built-declarations.mjs";
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

function readWorkspacePackages(root) {
  const globs = parseWorkspaceGlobs(
    readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8"),
  );
  if (globs.length === 0) {
    throw new Error("pnpm-workspace.yaml declares no `packages:` entries.");
  }
  const byName = new Map();
  for (const glob of globs) {
    for (const manifest of globSync(`${glob}/package.json`, {
      cwd: root,
    })) {
      const pkg = readJson(path.join(root, manifest));
      if (typeof pkg.name !== "string") continue;
      byName.set(pkg.name, {
        manifest: manifest.replaceAll("\\", "/"),
        isPrivate: pkg.private === true,
        hasVersion: Boolean(pkg.version),
      });
    }
  }
  return byName;
}

function readChangesetBumps(root) {
  const changesetDir = path.join(root, ".changeset");
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

export function readSkipRules(config) {
  const privatePackages = config.privatePackages;
  const versionsPrivate =
    typeof privatePackages === "object" && privatePackages !== null
      ? privatePackages.version === true
      : privatePackages === true;
  return {
    ignored: config.ignore ?? [],
    skipsPrivate: !versionsPrivate,
  };
}

function expandPackageGlobs(packageNames, patterns) {
  const names = [...packageNames];
  const matches = new Set();
  for (const rawPattern of patterns) {
    let pattern = rawPattern;
    let negated = false;
    while (pattern.startsWith("!") && !pattern.startsWith("!(")) {
      negated = !negated;
      pattern = pattern.slice(1);
    }

    for (const name of names) {
      if (!path.matchesGlob(name, pattern)) continue;
      if (negated) matches.delete(name);
      else matches.add(name);
    }
  }
  return matches;
}

export function findUnreleasablePackages(packages, bumps, rules) {
  const ignored = expandPackageGlobs(packages.keys(), rules.ignored);
  const isSkipped = (name, pkg) =>
    ignored.has(name) ||
    (pkg.isPrivate && rules.skipsPrivate) ||
    !pkg.hasVersion;
  const filesWithReleasedBumps = new Set(
    bumps
      .filter(({ name }) => {
        const pkg = packages.get(name);
        return pkg && !isSkipped(name, pkg);
      })
      .map(({ file }) => file),
  );
  const problems = [];
  for (const { file, name } of bumps) {
    const pkg = packages.get(name);
    if (!pkg) {
      problems.push({
        file,
        name,
        reason: "is not a workspace package (misspelled or renamed?)",
      });
    } else if (pkg.isPrivate && rules.skipsPrivate) {
      problems.push({
        file,
        name,
        reason: `is private (${pkg.manifest}) and is never versioned`,
      });
    } else if (ignored.has(name) && filesWithReleasedBumps.has(file)) {
      problems.push({
        file,
        name,
        reason:
          "matches `ignore` in .changeset/config.json and shares a changeset with a released package",
      });
    } else if (!pkg.hasVersion && filesWithReleasedBumps.has(file)) {
      problems.push({
        file,
        name,
        reason: "has no version and shares a changeset with a released package",
      });
    }
  }
  return problems;
}

export function runCheck(root = repoRoot) {
  const packages = readWorkspacePackages(root);
  const rules = readSkipRules(
    readJson(path.join(root, ".changeset", "config.json")),
  );
  return {
    packageCount: packages.size,
    problems: findUnreleasablePackages(
      packages,
      readChangesetBumps(root),
      rules,
    ),
  };
}

function main() {
  const { packageCount, problems } = runCheck(process.env.CHANGESET_CHECK_ROOT);

  if (problems.length > 0) {
    console.error("Changesets name packages that cannot be released:\n");
    for (const { file, name, reason } of problems) {
      console.error(`  .changeset/${file}: "${name}" ${reason}`);
    }
    console.error(
      "\nChangesets refuses a changeset that mixes a skipped package with a released one,",
    );
    console.error(
      "so `changeset version` aborts and every release stays blocked until the line is removed.",
    );
    console.error("\nDrop the offending line from the changeset frontmatter.");
    process.exit(1);
  }

  console.log(
    `All changeset bumps name releasable workspace packages. (${packageCount} packages scanned)`,
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) main();
