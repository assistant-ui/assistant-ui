#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { changedFilesSince } from "./lib/changed-files.mjs";
import { isExecutedAsMain } from "./lib/main.mjs";
import { optionValues } from "./lib/script-options.mjs";
import { requiresFullApiSurface } from "./update-api-surface.mjs";

export function autofixInstallArgs(changedFiles, base) {
  const args = ["install", "--frozen-lockfile", "--ignore-scripts"];
  if (requiresFullApiSurface(changedFiles)) return args;

  return [
    ...args,
    "--filter=.",
    "--filter=@assistant-ui/x-buildutils...",
    `--filter=...[${base}]...`,
    "--filter=!./apps/*",
    "--filter=!./examples/*",
    "--filter=!./templates/*",
  ];
}

function main() {
  const bases = optionValues(process.argv.slice(2), "--base");
  if (bases.length !== 1) throw new Error("Exactly one --base is required.");

  const base = bases[0];
  const args = autofixInstallArgs(changedFilesSince(base), base);
  console.log(
    args.some((arg) => arg.startsWith("--filter="))
      ? `Installing dependencies for workspaces affected since ${base}.`
      : `Installing every workspace because shared inputs changed since ${base}.`,
  );

  const result = spawnSync("pnpm", args, {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) main();
