#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./check-built-declarations.mjs";
import { parseBumpLine } from "./check-changesets.mjs";
import { collectPackages } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export function bumpVersion(version, bumpType) {
  const [major, minor, patch] = version.split(".").map(Number);
  if (bumpType === "major") return `${major + 1}.0.0`;
  if (bumpType === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function isOutsideCaretRange(rangeVersion, newVersion) {
  const [rangeMajor, rangeMinor, rangePatch] = rangeVersion
    .split(".")
    .map(Number);
  const [newMajor, newMinor, newPatch] = newVersion.split(".").map(Number);
  if (rangeMajor === 0 && rangeMinor === 0) {
    return newMajor !== 0 || newMinor !== 0 || newPatch !== rangePatch;
  }
  if (rangeMajor === 0) {
    return newMajor !== 0 || newMinor !== rangeMinor;
  }
  return newMajor !== rangeMajor;
}

export function buildDependencyGraph(manifests) {
  const pkgMap = new Map();
  for (const pkg of manifests) {
    pkgMap.set(pkg.name, { version: pkg.version });
  }

  const revDeps = new Map();
  for (const pkg of manifests) {
    const published = { ...pkg.dependencies, ...pkg.peerDependencies };
    for (const [dependency, rawRange] of Object.entries(published)) {
      if (typeof rawRange !== "string") continue;
      const target = pkgMap.get(dependency);
      if (!target) continue;
      // `workspace:^` publishes as `^<the dependency version>`, so it constrains
      // consumers exactly like the literal range a sibling writes by hand. Only
      // this form is resolved because scripts/check-workspace-ranges.mjs rejects
      // every other protocol spelling in a published dependency field.
      const range =
        rawRange === "workspace:^" ? `^${target.version}` : rawRange;
      if (!range.startsWith("^")) continue;
      if (!revDeps.has(dependency)) revDeps.set(dependency, []);
      revDeps.get(dependency).push({
        name: pkg.name,
        version: pkg.version,
        range,
      });
    }
  }

  return { pkgMap, revDeps };
}

export function computeCascade(bumps, pkgMap, revDeps) {
  const cascade = [];
  const visited = new Set(bumps.map(({ name }) => name));
  const queue = bumps.map(({ name, version, bumpType }) => ({
    name,
    newVersion: bumpVersion(version, bumpType),
  }));

  for (let index = 0; index < queue.length; index++) {
    const { name, newVersion } = queue[index];
    for (const dependent of revDeps.get(name) ?? []) {
      if (visited.has(dependent.name)) continue;
      const rangeVersion = dependent.range.replace(/^\^/, "");
      if (!isOutsideCaretRange(rangeVersion, newVersion)) continue;
      visited.add(dependent.name);

      const version = pkgMap.get(dependent.name)?.version ?? dependent.version;
      const cascadeVersion = bumpVersion(version, "patch");
      const isBreaking = isOutsideCaretRange(version, cascadeVersion);
      cascade.push({
        name: dependent.name,
        version,
        newVersion: cascadeVersion,
        isBreaking,
      });
      if (isBreaking) {
        queue.push({ name: dependent.name, newVersion: cascadeVersion });
      }
    }
  }

  return cascade;
}

export function findRangeBreakingBumps(bumps) {
  const problems = [];
  for (const bump of bumps) {
    const major = Number(bump.version.split(".")[0]);
    // A 0.0.x patch also leaves `^0.0.x`, which matches exactly. It is left
    // unreported so that pre-stable packages can ship a patch without every
    // release being flagged; the cascade table still shows who it moves.
    const breaksRange =
      (major === 0 && bump.bumpType !== "patch") ||
      (major >= 1 && bump.bumpType === "major");
    if (!breaksRange) continue;
    problems.push({
      ...bump,
      reason:
        major === 0
          ? `0.x package — ${bump.bumpType} bump breaks \`^\` caret range`
          : "major bump breaks `^` caret range",
    });
  }
  return problems;
}

function renderCascadeSection(cascade) {
  if (cascade.length === 0) return "";
  const breaking = cascade.filter((entry) => entry.isBreaking);
  const parts = [
    `### Cascade Impact (${cascade.length} packages)\n\n`,
    "| Package | Version | Cascade Bump | Breaking |\n",
    "| --- | --- | --- | --- |\n",
  ];
  for (const entry of cascade) {
    const indicator = entry.isBreaking
      ? `⛔ YES — \`^${entry.version}\` breaks`
      : "✅ no";
    parts.push(
      `| \`${entry.name}\` | ${entry.version} → ${entry.newVersion} | patch | ${indicator} |\n`,
    );
  }
  parts.push("\n");
  if (breaking.length > 0) {
    parts.push(
      `> **${breaking.length} downstream package(s)** will also break their consumers' \`^\` ranges.\n\n`,
    );
  }
  return parts.join("");
}

export function renderSummary({ bumps, violations, cascade }) {
  if (violations.length === 0) {
    const parts = [
      "## Changeset Impact Summary\n\n",
      "| File | Package | Version | Bump |\n",
      "| --- | --- | --- | --- |\n",
    ];
    for (const bump of bumps) {
      parts.push(
        `| \`${bump.file}\` | \`${bump.name}\` | ${bump.version} | ${bump.bumpType} |\n`,
      );
    }
    parts.push("\n", renderCascadeSection(cascade));
    return parts.join("");
  }

  const parts = [
    "## ⚠️ Semver-Breaking Changeset Detected\n\n",
    "| File | Package | Version | Bump | Why |\n",
    "| --- | --- | --- | --- | --- |\n",
  ];
  for (const violation of violations) {
    parts.push(
      `| \`${violation.file}\` | \`${violation.name}\` | ${violation.version} | **${violation.bumpType}** | ${violation.reason} |\n`,
    );
  }
  parts.push(
    "\n",
    renderCascadeSection(cascade),
    "### What this means\n\n",
    "- **0.x packages**: `^0.12.15` only matches `>=0.12.15 <0.13.0` — ",
    "a minor bump is effectively a breaking change for all consumers.\n",
    "- **1.x+ packages**: `^1.3.12` matches `>=1.3.12 <2.0.0` — ",
    "minor/patch are safe, but a major bump breaks all consumers.\n\n",
    "This check is informational — the PR can still be merged if this is intentional.\n",
  );
  return parts.join("");
}

function readChangesetFiles(root, changedFiles) {
  return readdirSync(path.join(root, ".changeset"))
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .filter((file) => changedFiles === null || changedFiles.has(file))
    .sort();
}

function readChangesetBumps(root, files, pkgMap) {
  const bumps = [];
  for (const file of files) {
    const frontmatter = readFileSync(
      path.join(root, ".changeset", file),
      "utf8",
    ).match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) continue;
    for (const line of frontmatter[1].split("\n")) {
      const parsed = parseBumpLine(line);
      if (!parsed) continue;
      const pkg = pkgMap.get(parsed.name);
      if (!pkg) continue;
      bumps.push({
        file,
        name: parsed.name,
        bumpType: parsed.bump,
        version: pkg.version,
      });
    }
  }
  return bumps;
}

export function runCheck(root = repoRoot, changedFiles = null) {
  const manifests = collectPackages(root, null, (a, b) =>
    a.localeCompare(b),
  ).map(({ pkg }) => pkg);
  const { pkgMap, revDeps } = buildDependencyGraph(manifests);
  const files = readChangesetFiles(root, changedFiles);
  const bumps = readChangesetBumps(root, files, pkgMap);
  return {
    files,
    bumps,
    violations: findRangeBreakingBumps(bumps),
    cascade: computeCascade(bumps, pkgMap, revDeps),
  };
}

function annotate(level, message) {
  console.log(process.env.GITHUB_ACTIONS ? `::${level}::${message}` : message);
}

function writeSummary(summary) {
  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummary) appendFileSync(stepSummary, summary);
  else process.stdout.write(summary);
}

function diffChangesetFiles(root, baseSha, headSha) {
  try {
    const diff = execFileSync(
      "git",
      [
        "diff",
        "--name-only",
        "--diff-filter=ACM",
        baseSha,
        headSha,
        "--",
        ".changeset/*.md",
      ],
      { cwd: root, encoding: "utf8" },
    ).trim();
    return new Set(diff ? diff.split("\n").map((f) => path.basename(f)) : []);
  } catch {
    annotate(
      "warning",
      "Could not diff against base — checking all changeset files",
    );
    return null;
  }
}

function main() {
  const root = process.env.CHANGESET_SEMVER_CHECK_ROOT ?? repoRoot;
  const { BASE_SHA, HEAD_SHA } = process.env;
  const changedFiles =
    BASE_SHA && HEAD_SHA ? diffChangesetFiles(root, BASE_SHA, HEAD_SHA) : null;

  const { files, bumps, violations, cascade } = runCheck(root, changedFiles);

  if (files.length === 0) {
    console.log("No changeset files changed in this PR.");
    return;
  }
  if (bumps.length === 0) {
    console.log("No package bumps found in changesets.");
    return;
  }

  writeSummary(renderSummary({ bumps, violations, cascade }));

  if (violations.length === 0) {
    console.log(
      "All changeset bump types are safe for current package versions. ✓",
    );
    return;
  }

  for (const entry of cascade.filter((c) => c.isBreaking)) {
    annotate(
      "warning",
      `Cascade breaks ${entry.name} (${entry.version} → ${entry.newVersion}, ^${entry.version} consumers affected)`,
    );
  }
  annotate(
    "error",
    `Semver-breaking bumps detected: ${violations
      .map((v) => `${v.name}@${v.bumpType}`)
      .join(", ")}`,
  );
  process.exit(1);
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) main();
