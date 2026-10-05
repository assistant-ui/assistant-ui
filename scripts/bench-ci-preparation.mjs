import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { REF_PACKAGE_DIRS } from "../packages/x-performance/lib/ref-packages.mjs";

const result = {
  variant: process.env.BENCH_VARIANT,
  sample: Number(process.env.BENCH_SAMPLE),
  preparationSeconds: (Date.now() - Number(process.env.PREP_STARTED)) / 1000,
  node: process.version,
  revision: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
};
mkdirSync("bench-results", { recursive: true });
const save = () =>
  writeFileSync("bench-results/results.json", JSON.stringify(result, null, 2));
save();
const filters = Object.keys(REF_PACKAGE_DIRS).map((name) => `--filter=${name}`);
const plan = JSON.parse(
  execFileSync(
    "node_modules/.bin/turbo",
    ["run", "build", ...filters, "--dry=json"],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  ),
);
result.tasks = plan.tasks
  .filter((task) => task.command !== "<NONEXISTENT>")
  .map(({ taskId, hash }) => ({ taskId, hash }));
execFileSync(
  "node_modules/.bin/turbo",
  ["run", "build", ...filters, "--cache=local:rw"],
  { stdio: "inherit" },
);
result.fingerprints = {};
for (const task of plan.tasks.filter(
  (task) => task.command !== "<NONEXISTENT>",
)) {
  const dist = join(task.directory, "dist");
  const hash = createHash("sha256");
  for (const file of readdirSync(dist, { recursive: true }).sort()) {
    const path = join(dist, file);
    if (!statSync(path).isFile() || file.endsWith(".map")) continue;
    hash.update(file).update("\0").update(readFileSync(path)).update("\0");
  }
  result.fingerprints[task.taskId] = hash.digest("hex");
}
execFileSync(
  "pnpm",
  ["exec", "vitest", "bench", "--run", "bench/accumulator.bench.ts"],
  { cwd: "packages/x-performance", stdio: "inherit" },
);
assert(
  Object.keys(result.fingerprints).length >=
    Object.keys(REF_PACKAGE_DIRS).length,
);
result.verified = true;
save();
console.log(JSON.stringify(result));
