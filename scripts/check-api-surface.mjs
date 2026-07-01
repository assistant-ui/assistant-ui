#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { hasOption, optionArgs, optionValues } from "./lib/script-options.mjs";

const repoRoot = process.cwd();
const scriptArgs = process.argv.slice(2);
const filters = optionValues(scriptArgs, "--filter");
const skipBuild = hasOption(scriptArgs, "--skip-build");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const buildFilterArgs = filters.length
  ? optionArgs("--filter", filters)
  : ["--filter", "./packages/*"];

if (!skipBuild) {
  run("pnpm", ["exec", "turbo", "build", "--force", ...buildFilterArgs]);
}
run("node", [
  path.join("scripts", "generate-api-surface.mjs"),
  "--check",
  ...optionArgs("--filter", filters),
]);
run("pnpm", ["--filter", "@assistant-ui/api-surface", "check"]);
