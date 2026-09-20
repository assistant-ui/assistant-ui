#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { globSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { isExecutedAsMain } from "./check-built-declarations.mjs";
import { hasOption } from "./lib/script-options.mjs";
import { readJson } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const BUMP_VALUES = new Set(["patch", "minor", "major"]);
const TEST_DIRECTORIES = new Set(["__fixtures__", "__tests__", "tests"]);
const TEST_FILE = /\.(?:bench|spec|test)\.[^/]+$/;
const RELEASE_REWRITTEN_KEYS = new Set(["version"]);
const CONSUMER_INERT_KEYS = new Set(["devDependencies"]);
const DEPENDENCY_KEYS = new Set([
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
]);
const CONSUMER_RUN_SCRIPTS = new Set(["install", "postinstall", "preinstall"]);

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
        releaseFiles: (Array.isArray(pkg.files) ? pkg.files : ["."])
          .filter((entry) => typeof entry === "string")
          .map((entry) => entry.replace(/^(!?)\.\//, "$1"))
          .filter(Boolean),
      });
    }
  }
  return byName;
}

function readChangesetBumps(root, files = null) {
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

function packageSkipRules(packages, rules) {
  const ignored = expandPackageGlobs(packages.keys(), rules.ignored);
  const isSkipped = (name, pkg) =>
    ignored.has(name) ||
    (pkg.isPrivate && rules.skipsPrivate) ||
    !pkg.hasVersion;
  return { ignored, isSkipped };
}

export function findUnreleasablePackages(packages, bumps, rules) {
  const { ignored, isSkipped } = packageSkipRules(packages, rules);
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

function matchesFilesEntry(relative, entry) {
  const pattern = entry.replace(/^!/, "").replace(/\/$/, "");
  if (pattern === ".") return true;
  if (!/[*?{}[\]]/.test(pattern)) {
    return relative === pattern || relative.startsWith(`${pattern}/`);
  }
  return path.matchesGlob(relative, pattern);
}

export function isReleaseRelevantPackageFile(file, pkg) {
  const packageRoot = path.posix.dirname(pkg.manifest);
  if (!file.startsWith(`${packageRoot}/`)) return false;

  const relative = file.slice(packageRoot.length + 1);
  if (
    relative === "package.json" ||
    relative.startsWith("dist/") ||
    (!relative.includes("/") && /\.md$/i.test(relative)) ||
    relative.split("/").some((segment) => TEST_DIRECTORIES.has(segment)) ||
    TEST_FILE.test(relative)
  ) {
    return false;
  }

  return (
    pkg.releaseFiles.some(
      (entry) => !entry.startsWith("!") && matchesFilesEntry(relative, entry),
    ) &&
    !pkg.releaseFiles.some(
      (entry) => entry.startsWith("!") && matchesFilesEntry(relative, entry),
    )
  );
}

export function findMissingPackageChangesets(
  packages,
  changedFiles,
  bumpedNames,
) {
  const missing = [];
  for (const [name, pkg] of packages) {
    if (bumpedNames.has(name)) continue;
    const files = changedFiles.filter((file) =>
      isReleaseRelevantPackageFile(file, pkg),
    );
    if (files.length > 0) missing.push({ name, files });
  }
  return missing.sort((a, b) => (a.name < b.name ? -1 : 1));
}

function pickEntries(block, keep) {
  if (block === null || typeof block !== "object") return {};
  return Object.fromEntries(Object.entries(block).filter(([key]) => keep(key)));
}

function publishedManifestFields(manifest, workspacePackageNames) {
  const fields = {};
  for (const [key, value] of Object.entries(manifest)) {
    if (
      RELEASE_REWRITTEN_KEYS.has(key) ||
      CONSUMER_INERT_KEYS.has(key) ||
      DEPENDENCY_KEYS.has(key) ||
      key === "scripts"
    ) {
      continue;
    }
    fields[key] = value;
  }
  for (const key of DEPENDENCY_KEYS) {
    fields[key] = pickEntries(
      manifest[key],
      (dependency) => !workspacePackageNames.has(dependency),
    );
  }
  fields.scripts = pickEntries(manifest.scripts, (script) =>
    CONSUMER_RUN_SCRIPTS.has(script),
  );
  return fields;
}

export function findChangedManifestFields(base, head, workspacePackageNames) {
  const before = publishedManifestFields(base ?? {}, workspacePackageNames);
  const after = publishedManifestFields(head ?? {}, workspacePackageNames);
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => !isDeepStrictEqual(before[key], after[key]))
    .sort();
}

function runGit(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function listChangedFiles(root, baseSha, headSha) {
  return runGit(root, [
    "diff",
    "--name-only",
    "--no-renames",
    "-z",
    `${baseSha}...${headSha}`,
  ])
    .split("\0")
    .filter(Boolean);
}

function readManifestAt(root, ref, file) {
  try {
    return JSON.parse(runGit(root, ["show", `${ref}:${file}`]));
  } catch {
    return null;
  }
}

export function runChangedPackageCheck(root, baseSha, headSha) {
  let forkPoint;
  let changedFiles;
  try {
    forkPoint = runGit(root, ["merge-base", baseSha, headSha]).trim();
    changedFiles = listChangedFiles(root, baseSha, headSha);
  } catch (error) {
    const stderr = String(error.stderr ?? "").trim();
    return { error: stderr.split("\n").at(-1) || error.message };
  }

  const workspacePackages = readWorkspacePackages(root);
  const { isSkipped } = packageSkipRules(
    workspacePackages,
    readSkipRules(readJson(path.join(root, ".changeset", "config.json"))),
  );
  const packages = new Map(
    [...workspacePackages].filter(([name, pkg]) => !isSkipped(name, pkg)),
  );
  const releasable = [...packages.values()];
  const sourceFiles = changedFiles.filter((file) =>
    releasable.some((pkg) => isReleaseRelevantPackageFile(file, pkg)),
  );
  const changesetFiles = new Set(
    changedFiles
      .filter((file) => path.posix.dirname(file) === ".changeset")
      .map((file) => path.posix.basename(file)),
  );
  const bumpedNames = new Set(
    readChangesetBumps(root, changesetFiles).map(({ name }) => name),
  );

  const missing = new Map(
    findMissingPackageChangesets(packages, sourceFiles, bumpedNames).map(
      ({ name, files }) => [name, { name, files, fields: [] }],
    ),
  );
  const workspacePackageNames = new Set(workspacePackages.keys());
  const changedManifests = new Set(
    changedFiles.filter((file) => path.posix.basename(file) === "package.json"),
  );
  for (const [name, pkg] of packages) {
    if (bumpedNames.has(name) || !changedManifests.has(pkg.manifest)) continue;
    const fields = findChangedManifestFields(
      readManifestAt(root, forkPoint, pkg.manifest),
      readManifestAt(root, headSha, pkg.manifest),
      workspacePackageNames,
    );
    if (fields.length === 0) continue;
    const entry = missing.get(name);
    if (entry) entry.fields = fields;
    else missing.set(name, { name, files: [], fields });
  }

  return {
    changedSourceCount: sourceFiles.length,
    missingChangesets: [...missing.values()].sort((a, b) =>
      a.name < b.name ? -1 : 1,
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

function summarize(items) {
  const limit = 5;
  const summary = items.slice(0, limit).join(", ");
  const remaining = items.length - limit;
  return remaining > 0 ? `${summary}, and ${remaining} more` : summary;
}

function describeMissingChangeset({ name, files, fields }) {
  const evidence = [];
  if (files.length > 0) evidence.push(summarize(files));
  if (fields.length > 0) evidence.push(`package.json: ${summarize(fields)}`);
  return `  "${name}" (${evidence.join("; ")})`;
}

function mainChangedPackages() {
  const { BASE_SHA, HEAD_SHA } = process.env;
  if (!BASE_SHA || !HEAD_SHA) {
    console.error(
      "BASE_SHA and HEAD_SHA are required with --changed-packages.",
    );
    process.exit(1);
  }

  const result = runChangedPackageCheck(
    process.env.CHANGESET_CHECK_ROOT ?? repoRoot,
    BASE_SHA,
    HEAD_SHA,
  );
  if ("error" in result) {
    console.error(
      `Could not diff ${BASE_SHA}...${HEAD_SHA}: ${result.error}. Failing instead of skipping changeset validation.`,
    );
    process.exit(1);
  }

  if (result.missingChangesets.length > 0) {
    console.error("Changed published packages without a changeset:\n");
    for (const missing of result.missingChangesets) {
      console.error(describeMissingChangeset(missing));
    }
    console.error(
      "\nAdd a changeset from this PR that names every changed published package.",
    );
    process.exit(1);
  }

  console.log(
    `All changed published packages have changesets. (${result.changedSourceCount} source files scanned)`,
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  if (hasOption(process.argv.slice(2), "--changed-packages")) {
    mainChangedPackages();
  } else {
    main();
  }
}
