#!/usr/bin/env node
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./check-built-declarations.mjs";
import { parseWorkspaceGlobs } from "./check-changesets.mjs";
import { readJson } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const PUBLISHED_FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
];

const WORKSPACE_PROTOCOL = "workspace:";
const REQUIRED_PROTOCOL = "workspace:^";

function readWorkspaceManifests(root) {
  const globs = parseWorkspaceGlobs(
    readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8"),
  );
  if (globs.length === 0) {
    throw new Error("pnpm-workspace.yaml declares no `packages:` entries.");
  }
  const manifests = [];
  const seen = new Set();
  for (const glob of globs) {
    for (const manifest of globSync(`${glob}/package.json`, { cwd: root })) {
      const posix = manifest.replaceAll("\\", "/");
      if (seen.has(posix)) continue;
      seen.add(posix);
      const pkg = readJson(path.join(root, manifest));
      if (typeof pkg.name !== "string") continue;
      manifests.push({ manifest: posix, pkg });
    }
  }
  return manifests.sort((a, b) => a.manifest.localeCompare(b.manifest));
}

export function dedupesWithCaret(range) {
  if (range.startsWith(WORKSPACE_PROTOCOL)) return range === REQUIRED_PROTOCOL;
  return range === "*" || range.startsWith("^");
}

export function findNarrowWorkspaceRanges(manifests) {
  const workspaceNames = new Set(manifests.map(({ pkg }) => pkg.name));
  const problems = [];
  for (const { manifest, pkg } of manifests) {
    if (pkg.private === true) continue;
    for (const field of PUBLISHED_FIELDS) {
      for (const [dependency, range] of Object.entries(pkg[field] ?? {})) {
        if (typeof range !== "string") continue;
        if (
          !workspaceNames.has(dependency) &&
          !range.startsWith(WORKSPACE_PROTOCOL)
        ) {
          continue;
        }
        if (dedupesWithCaret(range)) continue;
        problems.push({ manifest, name: pkg.name, field, dependency, range });
      }
    }
  }
  return problems;
}

export function runCheck(root = repoRoot) {
  const manifests = readWorkspaceManifests(root);
  return {
    packageCount: manifests.length,
    problems: findNarrowWorkspaceRanges(manifests),
  };
}

function main() {
  const { packageCount, problems } = runCheck(
    process.env.WORKSPACE_RANGE_CHECK_ROOT,
  );

  if (problems.length > 0) {
    console.error(
      "Published packages declare a workspace dependency on a range that cannot deduplicate:\n",
    );
    for (const { manifest, name, field, dependency, range } of problems) {
      console.error(
        `  ${manifest}: "${name}" ${field}["${dependency}"] is "${range}"`,
      );
    }
    console.error(
      "\npnpm rewrites `workspace:*` to the exact version at publish time, and a literal exact or",
    );
    console.error(
      "tilde range pins just as hard. Neither unifies with the caret range a sibling publishes for",
    );
    console.error(
      "the same package, so a consumer that installs both ends up with two physical copies. That",
    );
    console.error(
      "breaks the singleton contract for @assistant-ui/core, @assistant-ui/store, and",
    );
    console.error(
      "@assistant-ui/tap: React contexts resolve to the wrong provider, tools never reach the",
    );
    console.error("runtime, and `instanceof` checks fail.");
    console.error(
      `\nDeclare the dependency as \`${REQUIRED_PROTOCOL}\`, which publishes as \`^<version>\`, or as a literal \`^\` range.`,
    );
    process.exit(1);
  }

  console.log(
    `All published workspace dependencies deduplicate. (${packageCount} packages scanned)`,
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) main();
