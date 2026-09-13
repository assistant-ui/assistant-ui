#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { collectTurboFilteredPackageNames } from "./lib/workspace.mjs";
import { optionArgs } from "./lib/script-options.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

// Core has 103 existing test-fixture errors across 29 files. Remove this
// exception when https://github.com/assistant-ui/assistant-ui/issues/7102 lands.
export const DIRECT_TYPECHECK_EXCLUSIONS = ["@assistant-ui/core"];

export function dependencyBuildFilters(packageNames) {
  return [...packageNames].sort().map((name) => `${name}^...`);
}

export function collectDirectTypecheckPackageNames(root, selector) {
  return collectTurboFilteredPackageNames(
    root,
    [selector, ...DIRECT_TYPECHECK_EXCLUSIONS.map((name) => `!${name}`)],
    { failureMessage: "Unable to resolve changed workspaces for typechecking" },
  );
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runWorkspaceTypecheck(filters) {
  run("pnpm", [
    "-r",
    ...optionArgs("--filter", filters),
    "--workspace-concurrency=4",
    "--no-bail",
    "exec",
    "sh",
    "-c",
    'if test -f tsconfig.json; then echo "Type-checking $PWD"; tsc --noEmit; fi',
  ]);
}

export function main(args = process.argv.slice(2)) {
  const selector = args.find((arg) => arg !== "--");
  if (!selector) {
    runWorkspaceTypecheck([]);
    return;
  }

  const selectedPackageNames = collectDirectTypecheckPackageNames(
    repoRoot,
    selector,
  );
  const buildFilters = dependencyBuildFilters(selectedPackageNames);
  if (buildFilters.length > 0) {
    run("pnpm", [
      "exec",
      "turbo",
      "build",
      ...optionArgs("--filter", buildFilters),
    ]);
  }

  runWorkspaceTypecheck([
    selector,
    ...DIRECT_TYPECHECK_EXCLUSIONS.map((name) => `!${name}`),
  ]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
