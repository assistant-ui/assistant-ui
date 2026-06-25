#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = process.cwd();
const filters = optionValues("--filter");
const skipBuild = process.argv.includes("--skip-build");

function optionValues(name) {
  const values = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === name) {
      const value = args[i + 1];
      if (value === undefined) {
        throw new Error(`Missing value for ${name}.`);
      }
      values.push(value);
      i++;
    } else if (arg.startsWith(`${name}=`)) {
      values.push(arg.slice(name.length + 1));
    }
  }
  return values;
}

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
  ? filters.flatMap((filter) => ["--filter", filter])
  : ["--filter", "./packages/*"];

if (!skipBuild) {
  run("pnpm", ["exec", "turbo", "build", "--force", ...buildFilterArgs]);
}
run("node", [
  path.join("scripts", "generate-api-surface.mjs"),
  "--check",
  ...filters.flatMap((filter) => ["--filter", filter]),
]);
run("pnpm", ["--filter", "@assistant-ui/api-surface", "check"]);
