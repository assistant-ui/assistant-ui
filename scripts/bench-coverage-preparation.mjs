import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const base = "3c0f53a463a8c069098a7f722727643e55e631c0";
const sample = Number(process.env.BENCH_SAMPLE);
const source = process.cwd();
const scratch = mkdtempSync(join(tmpdir(), "aui-coverage-preparation-"));
const output = resolve("bench-results");
mkdirSync(output);
const results = { base, sample, rows: [] };
const save = () =>
  writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2));
let index = 0;
const env = {
  ...process.env,
  CI: "true",
  PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "false",
  REDIS_URL: "redis://127.0.0.1:6379",
  TURBO_TELEMETRY_DISABLED: "1",
  NO_COLOR: "1",
  FORCE_COLOR: "0",
};
delete env.TURBO_TOKEN;
delete env.TURBO_TEAM;
function run(cwd, label, command, args, overrides = {}) {
  const start = performance.now();
  const p = spawnSync(command, args, {
    cwd,
    env: { ...env, ...overrides },
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  const log = `${p.stdout ?? ""}\n${p.stderr ?? ""}`;
  const row = {
    label,
    seconds: (performance.now() - start) / 1000,
    status: p.status,
    log: `${index++}-${label}.log`,
  };
  writeFileSync(join(output, row.log), log);
  results.rows.push(row);
  save();
  console.log(JSON.stringify(row));
  assert.equal(p.status, 0, log.slice(-18000));
  return log;
}
function clone(name) {
  const dir = join(scratch, name);
  execFileSync("git", ["clone", "--shared", "--no-checkout", source, dir]);
  execFileSync("git", ["checkout", "--detach", base], { cwd: dir });
  execFileSync("git", ["branch", "bench-base", base], { cwd: dir });
  const file = join(dir, "packages/mcp-docs-server/src/index.ts");
  writeFileSync(file, `${readFileSync(file, "utf8")}\n`);
  return dir;
}
async function redis(label) {
  run(source, `${label}-redis`, "bash", [
    "-c",
    'set -euo pipefail; docker run --detach --name aui-coverage-bench --publish 6379:6379 --health-cmd "redis-cli ping" --health-interval 5s --health-timeout 3s --health-retries 10 redis:8-alpine; for attempt in {1..50}; do if [ "$(docker inspect --format="{{.State.Health.Status}}" aui-coverage-bench)" = healthy ]; then exit 0; fi; sleep 1; done; docker logs aui-coverage-bench; exit 1',
  ]);
}
const snapshots = [];
const common = ["--filter=.", "--filter=@assistant-ui/react-devtools..."];
const forced = [
  "--filter=@assistant-ui/ai-sdk...",
  "--filter=@assistant-ui/core...",
  "--filter=@assistant-ui/store...",
];
const filters = ["--filter=...[bench-base]"];
const coverageArgs = [
  "run",
  "test:coverage",
  "--concurrency=1",
  ...filters,
  "--cache=local:rw",
];
function snapshot(dir) {
  const coverage = join(dir, "packages/mcp-docs-server/coverage");
  return {
    summary: readFileSync(
      join(coverage, "coverage-summary.json"),
      "utf8",
    ).replaceAll(dir, "<root>"),
    files: readdirSync(coverage, { recursive: true }).sort(),
    markdown: execFileSync(process.execPath, ["scripts/coverage-summary.mjs"], {
      cwd: dir,
      encoding: "utf8",
    }),
  };
}
for (const variant of sample % 2 ? ["after", "before"] : ["before", "after"]) {
  const dir = clone(variant);
  const store = join(scratch, `${variant}-store`);
  const installEnv = { PNPM_CONFIG_STORE_DIR: store };
  const install = run(
    dir,
    `${variant}-install`,
    "pnpm",
    [
      "install",
      "--frozen-lockfile",
      ...common,
      ...(variant === "before" ? forced : []),
      "--filter=...[bench-base]...",
    ],
    installEnv,
  );
  results[variant] = { scope: install.match(/Scope: (.*)/)?.[1] };
  const plan = JSON.parse(
    run(dir, `${variant}-plan`, "node_modules/.bin/turbo", [
      ...coverageArgs,
      "--dry=json",
    ]),
  );
  results[variant].tasks = plan.tasks.map(({ taskId, hash }) => ({
    taskId,
    hash,
  }));
  const needsRedis = plan.tasks.some(
    (task) =>
      task.task === "test:coverage" &&
      ["assistant-stream", "@assistant-ui/docs"].includes(task.package),
  );
  assert.equal(needsRedis, false);
  if (variant === "before") await redis(variant);
  run(dir, `${variant}-build`, "node_modules/.bin/turbo", [
    "run",
    "build",
    ...filters,
    "--filter=!./apps/*",
    "--filter=!./examples/*",
    "--filter=!./templates/*",
    "--cache=local:rw",
  ]);
  run(dir, `${variant}-coverage`, "node_modules/.bin/turbo", coverageArgs);
  snapshots.push(snapshot(dir));
  if (variant === "before")
    run(source, `${variant}-redis-stop`, "docker", [
      "rm",
      "--force",
      "aui-coverage-bench",
    ]);
  rmSync(join(dir, "packages/mcp-docs-server/coverage"), { recursive: true });
  run(
    dir,
    `${variant}-coverage-cache-replay`,
    "node_modules/.bin/turbo",
    coverageArgs,
  );
  assert.deepEqual(snapshot(dir), snapshots.at(-1));
  save();
}
assert.deepEqual(results.before.tasks, results.after.tasks);
assert.deepEqual(...snapshots);
results.coverage = snapshots[0];
results.verified = true;
save();
