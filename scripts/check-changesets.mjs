#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { globSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./check-built-declarations.mjs";
import { readJson } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const BUMP_VALUES = new Set(["patch", "minor", "major"]);
const PARSED_SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);
const AST_METADATA_KEYS = new Set([
  "comments",
  "end",
  "errors",
  "extra",
  "loc",
  "start",
]);
const OPERATIONAL_COMMENT =
  /(?:^\s*\/\s*<reference\b|@(?:jsx|ts-(?:check|nocheck|ignore|expect-error))\b|[#@]__(?:NO_SIDE_EFFECTS|PURE)__\b|\b(?:sourceMappingURL|sourceURL|vite-ignore|webpack\w*)\b|^!)/i;
const require = createRequire(import.meta.url);
let parseSource;

function getSourceParser() {
  parseSource ??= require("@babel/parser").parse;
  return parseSource;
}

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
        releaseFiles: (Array.isArray(pkg.files) ? pkg.files : ["src"])
          .filter((entry) => typeof entry === "string")
          .map((entry) => entry.replace(/^(!?)\.\//, "$1"))
          .filter(Boolean),
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

function isReleaseRelevantFile(relative) {
  const segments = relative.split("/");
  if (
    segments.some((segment) =>
      ["__fixtures__", "__tests__", "fixtures", "test", "tests"].includes(
        segment,
      ),
    )
  ) {
    return false;
  }

  return !/\.(?:bench|spec|stories|test)\.[^/]+$/.test(relative);
}

function matchesReleasePattern(relative, rawPattern) {
  const pattern = rawPattern.replace(/^!/, "").replace(/\/$/, "");
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
    relative === "dist" ||
    relative.startsWith("dist/") ||
    /\.md$/i.test(relative)
  ) {
    return false;
  }

  const included = pkg.releaseFiles.some(
    (pattern) =>
      !pattern.startsWith("!") && matchesReleasePattern(relative, pattern),
  );
  const excluded = pkg.releaseFiles.some(
    (pattern) =>
      pattern.startsWith("!") && matchesReleasePattern(relative, pattern),
  );
  return included && !excluded && isReleaseRelevantFile(relative);
}

function isOperationalComment(comment) {
  return (
    typeof comment?.value === "string" &&
    OPERATIONAL_COMMENT.test(comment.value.trim())
  );
}

function pruneSyntaxTree(value) {
  if (Array.isArray(value)) return value.map(pruneSyntaxTree);
  if (value === null || typeof value !== "object") return value;

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (
      key === "innerComments" ||
      key === "leadingComments" ||
      key === "trailingComments"
    ) {
      const comments = child
        .filter(isOperationalComment)
        .map(({ type, value: commentValue }) => ({
          type,
          value: commentValue.trim(),
        }));
      if (comments.length > 0) result[key] = comments;
    } else if (!AST_METADATA_KEYS.has(key)) {
      result[key] = pruneSyntaxTree(child);
    }
  }
  return result;
}

function sourceSignature(file, contents) {
  if (!PARSED_SOURCE_EXTENSIONS.has(path.extname(file))) return contents;

  const source = contents.toString("utf8");
  const isTypeScript = /\.[cm]?tsx?$/.test(file);
  const isDts = /\.d\.[cm]?ts$/.test(file);
  const usesJsx = /\.[jt]sx$/.test(file);
  const plugins = ["decorators-legacy"];
  if (isTypeScript) plugins.push(["typescript", { dts: isDts }]);
  if (usesJsx) plugins.push("jsx");

  try {
    const syntaxTree = getSourceParser()(source, {
      attachComment: true,
      plugins,
      sourceType: "unambiguous",
    });
    const unattachedOperationalComments = syntaxTree.comments
      .filter(isOperationalComment)
      .map(({ type, value }) => ({ type, value: value.trim() }));
    return JSON.stringify({
      program: pruneSyntaxTree(syntaxTree.program),
      operationalComments: unattachedOperationalComments,
    });
  } catch {
    return contents;
  }
}

function contentsDiffer(file, baseContents, headContents) {
  const empty = Buffer.alloc(0);
  const baseSignature = sourceSignature(file, baseContents ?? empty);
  const headSignature = sourceSignature(file, headContents ?? empty);
  if (Buffer.isBuffer(baseSignature) && Buffer.isBuffer(headSignature)) {
    return !baseSignature.equals(headSignature);
  }
  return baseSignature !== headSignature;
}

function readGitFile(root, sha, file) {
  return execFileSync("git", ["show", `${sha}:${file}`], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function findReleaseOwner(packages, file) {
  for (const [name, pkg] of packages) {
    if (isReleaseRelevantPackageFile(file, pkg)) return name;
  }
  return null;
}

function parseNameStatus(output) {
  const fields = output.toString("utf8").split("\0");
  if (fields.at(-1) === "") fields.pop();

  const entries = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (status.startsWith("R") || status.startsWith("C")) {
      entries.push({
        status: status[0],
        oldFile: fields[index++],
        file: fields[index++],
      });
    } else {
      entries.push({ status: status[0], file: fields[index++] });
    }
  }
  return entries;
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
      file.startsWith(`${packageRoot}/`),
    );
    if (files.length > 0 && !bumped.has(name)) {
      missing.push({ files, name });
    }
  }

  return missing;
}

function diffChangedFiles(root, baseSha, headSha, packages) {
  try {
    const mergeBase = execFileSync("git", ["merge-base", baseSha, headSha], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    const range = `${mergeBase}..${headSha}`;
    const packageRoots = [
      ...new Set(
        [...packages.values()].map(
          (pkg) => `${path.posix.dirname(pkg.manifest)}/**`,
        ),
      ),
    ];
    const packageChanges = parseNameStatus(
      execFileSync(
        "git",
        [
          "diff",
          "--name-status",
          "-z",
          "--find-renames",
          "--diff-filter=ADMRT",
          range,
          "--",
          ...packageRoots,
        ],
        { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
      ),
    );
    const changedPackageFiles = [];
    for (const { status, oldFile, file } of packageChanges) {
      const owner = findReleaseOwner(packages, file);
      if (status === "R") {
        const oldOwner = findReleaseOwner(packages, oldFile);
        if (oldOwner && oldOwner === owner) changedPackageFiles.push(file);
        else {
          if (oldOwner) changedPackageFiles.push(oldFile);
          if (owner) changedPackageFiles.push(file);
        }
        continue;
      }
      if (!owner) continue;

      const baseContents =
        status === "A" ? null : readGitFile(root, mergeBase, file);
      const headContents =
        status === "D" ? null : readGitFile(root, headSha, file);
      if (contentsDiffer(file, baseContents, headContents)) {
        changedPackageFiles.push(file);
      }
    }
    const changesets = execFileSync(
      "git",
      [
        "diff",
        "-z",
        "--name-only",
        "--diff-filter=ACMR",
        range,
        "--",
        ".changeset/*.md",
      ],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
    )
      .toString("utf8")
      .split("\0")
      .filter(Boolean);
    return [...new Set([...changedPackageFiles, ...changesets])];
  } catch (error) {
    const stderr = String(error.stderr ?? "").trim();
    return { error: stderr.split("\n").at(-1) || error.message };
  }
}

export function runChangedPackageCheck(root, baseSha, headSha) {
  const packages = readWorkspacePackages(root);
  const changedFiles = diffChangedFiles(root, baseSha, headSha, packages);
  if (!Array.isArray(changedFiles)) return changedFiles;

  const rules = readSkipRules(
    readJson(path.join(root, ".changeset", "config.json")),
  );
  const changesetFiles = new Set(
    changedFiles
      .filter((file) => file.startsWith(".changeset/"))
      .map((file) => path.basename(file)),
  );
  const sourceFiles = new Set(
    changedFiles.filter((file) =>
      [...packages.values()].some((pkg) =>
        isReleaseRelevantPackageFile(file, pkg),
      ),
    ),
  );

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

function summarizeFiles(files) {
  const limit = 5;
  const summary = files.slice(0, limit).join(", ");
  const remaining = files.length - limit;
  return remaining > 0 ? `${summary}, and ${remaining} more` : summary;
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
      console.error(`  "${name}" (${summarizeFiles(files)})`);
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
