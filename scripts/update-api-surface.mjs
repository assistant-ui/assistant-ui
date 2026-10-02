#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { changedFilesSince } from "./lib/changed-files.mjs";
import { optionArgs, optionValues } from "./lib/script-options.mjs";

export const FULL_API_SURFACE_INPUTS = [
  "api-surface",
  "packages/x-buildutils",
  "scripts/generate-api-surface.mjs",
  "scripts/autofix-install.mjs",
  "scripts/update-api-surface.mjs",
  "scripts/lib/changed-files.mjs",
  "scripts/lib/script-options.mjs",
  "scripts/lib/workspace.mjs",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  ".github/workflows/autofix.yaml",
];

const touches = (file, input) => file === input || file.startsWith(`${input}/`);

export function requiresFullApiSurface(changedFiles) {
  return changedFiles.some((file) =>
    FULL_API_SURFACE_INPUTS.some((input) => touches(file, input)),
  );
}

export function filtersForApiSurfaceChanges(changedFiles, base) {
  return requiresFullApiSurface(changedFiles) ? [] : [`...[${base}]`];
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

function main() {
  const args = process.argv.slice(2);
  const bases = optionValues(args, "--base");
  const explicitFilters = optionValues(args, "--filter");
  if (bases.length > 1) throw new Error("Only one --base may be provided.");
  if (bases.length > 0 && explicitFilters.length > 0) {
    throw new Error("Use either --base or --filter, not both.");
  }

  const base = bases[0];
  const filters = base
    ? filtersForApiSurfaceChanges(changedFilesSince(base), base)
    : explicitFilters;
  if (base) {
    console.log(
      filters.length > 0
        ? `Updating API surfaces affected since ${base}.`
        : `Updating every API surface because shared inputs changed since ${base}.`,
    );
  }

  for (const [command, commandArgs] of apiSurfaceCommands(filters)) {
    run(command, commandArgs);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
