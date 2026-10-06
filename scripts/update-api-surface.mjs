#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { changedFilesSince } from "./lib/changed-files.mjs";
import { hasOption, optionArgs, optionValues } from "./lib/script-options.mjs";
import { apiSurfaceFileName, collectPackages } from "./lib/workspace.mjs";

export const FULL_API_SURFACE_INPUTS = [
  "api-surface",
  "packages/x-buildutils",
  "scripts/generate-api-surface.mjs",
  "scripts/autofix-install.mjs",
  "scripts/update-api-surface.mjs",
  "scripts/lib/changed-files.mjs",
  "scripts/check-api-surface.mjs",
  "scripts/lib/script-options.mjs",
  "scripts/lib/workspace.mjs",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  ".github/workflows/autofix.yaml",
  ".github/workflows/code-quality.yaml",
];

const touches = (file, input) => file === input || file.startsWith(`${input}/`);

export function requiresFullApiSurface(changedFiles, packageNames = []) {
  const knownSnapshots = new Set(
    packageNames.map((name) => `api-surface/${apiSurfaceFileName(name)}`),
  );
  return changedFiles.some(
    (file) =>
      !knownSnapshots.has(file) &&
      FULL_API_SURFACE_INPUTS.some((input) => touches(file, input)),
  );
}

export function filtersForApiSurfaceChanges(
  changedFiles,
  base,
  packageNames = [],
) {
  if (requiresFullApiSurface(changedFiles, packageNames)) return [];

  const changed = new Set(changedFiles);
  const snapshotOwners = packageNames.filter((name) =>
    changed.has(`api-surface/${apiSurfaceFileName(name)}`),
  );
  return [`...[${base}]`, ...snapshotOwners.sort()];
}

export function apiSurfaceCommands(filters) {
  const filterArgs = optionArgs("--filter", filters);
  const buildFilterArgs = filters.length
    ? [
        ...filterArgs,
        "--filter=!./apps/*",
        "--filter=!./examples/*",
        "--filter=!./templates/*",
      ]
    : ["--filter=./packages/*"];

  return [
    ["pnpm", ["exec", "turbo", "build", ...buildFilterArgs]],
    ["node", [path.join("scripts", "generate-api-surface.mjs"), ...filterArgs]],
  ];
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

export function resolveApiSurfaceFilters(args) {
  const bases = optionValues(args, "--base");
  const explicitFilters = optionValues(args, "--filter");
  if (bases.length > 1) throw new Error("Only one --base may be provided.");
  if (bases.length > 0 && explicitFilters.length > 0) {
    throw new Error("Use either --base or --filter, not both.");
  }

  const base = bases[0];
  return base
    ? filtersForApiSurfaceChanges(
        changedFilesSince(base),
        base,
        collectPackages(process.cwd(), undefined, (a, b) =>
          a.localeCompare(b),
        ).map(({ pkg }) => pkg.name),
      )
    : explicitFilters;
}

function main() {
  const args = process.argv.slice(2);
  const filters = resolveApiSurfaceFilters(args);
  if (hasOption(args, "--print-filters")) {
    console.log(JSON.stringify(filters));
    return;
  }
  const base = optionValues(args, "--base")[0];
  if (base) {
    console.log(
      filters.length > 0
        ? `Updating API surfaces affected since ${base}.`
        : `Updating every API surface because shared inputs changed since ${base}.`,
    );
  }

  const commands = apiSurfaceCommands(filters);
  for (const [command, commandArgs] of hasOption(args, "--build-only")
    ? commands.slice(0, 1)
    : commands) {
    run(command, commandArgs);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
