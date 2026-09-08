#!/usr/bin/env node
import { execFileSync } from "node:child_process";
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

export function readWorkspacePackages(root) {
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

export function readChangesetBumps(root, files = null) {
  const changesetDir = path.join(root, ".changeset");
  const bumps = [];
  for (const file of readdirSync(changesetDir).sort()) {
    if (!file.endsWith(".md") || file === "README.md") continue;
    if (files && !files.has(file)) continue;
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

export function isReleaseRelevantSourceFile(file) {
  const match = file.match(/^packages\/[^/]+\/src\/(.+)$/);
  if (!match) return false;

  const relative = match[1];
  const segments = relative.split("/");
  if (
    segments.some((segment) =>
      [
        "__fixtures__",
        "__generated__",
        "__tests__",
        "fixtures",
        "generated",
        "test",
        "tests",
      ].includes(segment),
    )
  ) {
    return false;
  }

  return !/\.(?:bench|generated|spec|stories|test)\.[^/]+$/.test(relative);
}

export function findMissingPackageChangesets(
  packages,
  bumps,
  changedFiles,
  rules,
) {
  const ignored = expandPackageGlobs(packages.keys(), rules.ignored);
  const bumped = new Set(bumps.map(({ name }) => name));
  const missing = [];

  for (const [name, pkg] of packages) {
    if (
      ignored.has(name) ||
      (pkg.isPrivate && rules.skipsPrivate) ||
      !pkg.hasVersion
    ) {
      continue;
    }

    const packageRoot = path.posix.dirname(pkg.manifest);
    const files = [...changedFiles].filter((file) =>
      file.startsWith(`${packageRoot}/src/`),
    );
    if (files.length > 0 && !bumped.has(name)) {
      missing.push({ files, name });
    }
  }

  return missing;
}

function diffChangedFiles(root, baseSha, headSha) {
  try {
    const range = `${baseSha}...${headSha}`;
    const addedDeletedOrRenamed = execFileSync(
      "git",
      [
        "diff",
        "--name-only",
        "--diff-filter=ACDR",
        "--no-renames",
        range,
        "--",
        "packages/*/src/**",
      ],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    const modifiedPatch = execFileSync(
      "git",
      [
        "diff",
        "--unified=0",
        "--no-color",
        "--no-ext-diff",
        "--diff-filter=M",
        "--ignore-all-space",
        "--ignore-matching-lines=^[[:space:]]*//",
        range,
        "--",
        "packages/*/src/**",
      ],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const modified = modifiedPatch
      .split("\n")
      .filter((line) => line.startsWith("+++ b/"))
      .map((line) => line.slice("+++ b/".length));
    const changesets = execFileSync(
      "git",
      [
        "diff",
        "--name-only",
        "--diff-filter=ACMR",
        range,
        "--",
        ".changeset/*.md",
      ],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    return [...new Set([...addedDeletedOrRenamed, ...modified, ...changesets])];
  } catch (error) {
    const stderr = String(error.stderr ?? "").trim();
    return { error: stderr.split("\n").at(-1) || error.message };
  }
}

export function runChangedPackageCheck(root, baseSha, headSha) {
  const changedFiles = diffChangedFiles(root, baseSha, headSha);
  if (!Array.isArray(changedFiles)) return changedFiles;

  const packages = readWorkspacePackages(root);
  const rules = readSkipRules(
    readJson(path.join(root, ".changeset", "config.json")),
  );
  const changesetFiles = new Set(
    changedFiles
      .filter((file) => file.startsWith(".changeset/"))
      .map((file) => path.basename(file)),
  );
  const sourceFiles = new Set(changedFiles.filter(isReleaseRelevantSourceFile));

  return {
    changedSourceCount: sourceFiles.size,
    missingChangesets: findMissingPackageChangesets(
      packages,
      readChangesetBumps(root, changesetFiles),
      sourceFiles,
      rules,
    ),
  };
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

function annotateError(message) {
  if (!process.env.GITHUB_ACTIONS) {
    console.error(message);
    return;
  }
  const data = message
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
  console.error(`::error::${data}`);
}

function main() {
  const root = process.env.CHANGESET_CHECK_ROOT ?? repoRoot;
  const checksChangedPackages = process.argv.includes("--changed-packages");

  if (!checksChangedPackages) {
    const { packageCount, problems } = runCheck(root);

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
      console.error(
        "\nDrop the offending line from the changeset frontmatter.",
      );
      process.exit(1);
    }

    console.log(
      `All changeset bumps name releasable workspace packages. (${packageCount} packages scanned)`,
    );
    return;
  }

  const { BASE_SHA, HEAD_SHA } = process.env;
  if (!BASE_SHA || !HEAD_SHA) {
    console.error(
      "BASE_SHA and HEAD_SHA are required for changed package validation.",
    );
    process.exit(1);
  }

  const result = runChangedPackageCheck(root, BASE_SHA, HEAD_SHA);
  if ("error" in result) {
    annotateError(
      `Could not diff ${BASE_SHA}...${HEAD_SHA}: ${result.error}. Failing instead of skipping changeset validation.`,
    );
    process.exit(1);
  }

  const { changedSourceCount, missingChangesets } = result;
  if (missingChangesets.length > 0) {
    console.error("Changed published packages without a changeset:\n");
    for (const { files, name } of missingChangesets) {
      console.error(`  "${name}" (${files.join(", ")})`);
    }
    console.error(
      "\nAdd a changeset from this PR that names every changed published package.",
    );
    process.exit(1);
  }

  console.log(
    `All changed published packages have changesets. (${changedSourceCount} source files scanned)`,
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) main();
