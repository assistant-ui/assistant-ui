import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  workspaceInputs,
  workspacePackages,
} from "./deploy-examples-changes.mjs";
import { isExecutedAsMain } from "./lib/main.mjs";
import { isExcludedPackageTest } from "./lib/package-test-inputs.mjs";
import { readJson } from "./lib/workspace.mjs";

const DOCS_DIR = "apps/docs";

// The install, the Turbo graph, the docs build inputs in apps/docs/turbo.json,
// Tailwind's gitignore-aware source detection, and this script's own modules
// decide what a docs build produces.
const SHARED_INPUTS = [
  DOCS_DIR,
  ".gitignore",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  ".npmrc",
  ".nvmrc",
  "scripts/vercel-ignore-changeset-release.sh",
  "scripts/vercel-ignore-docs.mjs",
  "scripts/deploy-examples-changes.mjs",
  "scripts/lib",
  "packages/x-buildutils",
];

const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?|css|json|mdx?)$/;
// Module specifiers only: data files such as lib/traction.ts list every
// package name without compiling any of them.
const SPECIFIERS = [
  /(?:\bfrom|\bimport|\brequire\s*\(|\bimport\s*\()\s*["']([^"']+)["']/g,
  /@(?:import|source|plugin|reference)\s+["']([^"']+)["']/g,
];
// Path references reach a package without naming it: tsconfig paths, Turbo
// inputs, Tailwind sources, generator entry points, and path.join segments.
const PACKAGE_PATHS = [
  /(?<![\w.-])packages\/([\w.-]+)/g,
  /["']packages["']\s*,\s*["']([\w.-]+)["']/g,
];
const MDX_IMPORT = /^(?:import|export)\s[^\n]*?from\s*["']([^"']+)["']/;
const FENCE = /^\s*(?:```|~~~)/;

const touches = (file, input) => file === input || file.startsWith(`${input}/`);

// The type docs and the lite dev aliases read every package manifest.
const isPackageManifest = (file) =>
  /^packages\/[^/]+\/package\.json$/.test(file);

const packageName = (specifier) =>
  specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];

// Prose and code samples in MDX mention every package, so only the imports a
// page compiles count.
export function mdxImports(source) {
  const specifiers = [];
  let fenced = false;
  for (const line of source.split("\n")) {
    if (FENCE.test(line)) fenced = !fenced;
    else if (!fenced) {
      const match = line.match(MDX_IMPORT);
      if (match) specifiers.push(match[1]);
    }
  }
  return specifiers;
}

function referencedPackages(file, source, packages) {
  const dirs = new Set();
  const add = (specifier) => {
    const dir = packages.get(packageName(specifier));
    if (dir) dirs.add(dir);
  };
  if (file.endsWith(".mdx") || file.endsWith(".md")) {
    for (const specifier of mdxImports(source)) add(specifier);
    return dirs;
  }
  for (const pattern of SPECIFIERS) {
    for (const [, specifier] of source.matchAll(pattern)) add(specifier);
  }
  const known = new Set(packages.values());
  for (const pattern of PACKAGE_PATHS) {
    for (const [, name] of source.matchAll(pattern)) {
      if (known.has(`packages/${name}`)) dirs.add(`packages/${name}`);
    }
  }
  return dirs;
}

export function docsInputs(repoRoot, docsFiles) {
  const packages = workspacePackages(repoRoot);
  const seeds = new Set();
  for (const file of docsFiles) {
    if (!SOURCE_EXTENSIONS.test(file)) continue;
    const source = readFileSync(path.join(repoRoot, file), "utf8");
    for (const dir of referencedPackages(file, source, packages))
      seeds.add(dir);
  }
  const docs = readJson(path.join(repoRoot, DOCS_DIR, "package.json"));
  const inputs = new Set(SHARED_INPUTS);
  for (const dir of seeds) {
    inputs.add(dir);
    const pkg = readJson(path.join(repoRoot, dir, "package.json"));
    for (const input of workspaceInputs(repoRoot, pkg)) inputs.add(input);
  }
  for (const input of workspaceInputs(repoRoot, docs)) inputs.add(input);
  return [...inputs].sort();
}

export function affectedFiles(changedFiles, inputs) {
  return changedFiles.filter(
    (file) =>
      isPackageManifest(file) ||
      (!isExcludedPackageTest(file) &&
        inputs.some((input) => touches(file, input))),
  );
}

const git = (repoRoot, args) =>
  execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const hasCommit = (repoRoot, sha) =>
  spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: repoRoot })
    .status === 0;

// Exit 0 skips the build and 1 runs it. Anything this cannot decide builds.
export function decide(repoRoot, env) {
  const base = env.VERCEL_GIT_PREVIOUS_SHA;
  if (!base)
    return { build: true, reason: "no previous deployment to compare" };
  if (!hasCommit(repoRoot, base)) {
    // The deploy clone is shallow; the last deployed commit may sit below it.
    spawnSync(
      "git",
      ["fetch", "--quiet", "--no-tags", "--depth=1", "origin", base],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    );
    if (!hasCommit(repoRoot, base)) {
      return {
        build: true,
        reason: `previous deployment ${base} is not fetchable`,
      };
    }
  }
  const changed = git(repoRoot, [
    "diff",
    "--name-only",
    "--no-renames",
    "-z",
    base,
    "HEAD",
  ])
    .split("\0")
    .filter(Boolean);
  const docsFiles = git(repoRoot, ["ls-files", "-z", DOCS_DIR])
    .split("\0")
    .filter(Boolean);
  const affected = affectedFiles(changed, docsInputs(repoRoot, docsFiles));
  const range = `${base.slice(0, 7)}..HEAD`;
  if (affected.length === 0) {
    return {
      build: false,
      reason: `none of the ${changed.length} files changed in ${range} reach the docs build`,
    };
  }
  const more = affected.length > 1 ? ` and ${affected.length - 1} more` : "";
  return { build: true, reason: `${affected[0]}${more} changed in ${range}` };
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const { build, reason } = decide(repoRoot, process.env);
  console.log(`${build ? "Building" : "Skipping"} docs: ${reason}.`);
  process.exitCode = build ? 1 : 0;
}
