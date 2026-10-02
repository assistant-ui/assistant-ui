import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const scenario = process.env.SCENARIO;
const repeat = Number(process.env.REPEAT);
const source = process.cwd();
const base = "b6444661cf03cae6c5e10baba1e12c9e010b8ea0";
const dir = join(process.env.RUNNER_TEMP, `preparation-${scenario}-${repeat}`);
mkdirSync(dir, { recursive: true });
const env = { ...process.env, CI: "true", TURBO_TELEMETRY_DISABLED: "1" };
const run = (cwd, command, args, capture = false, extraEnv = {}) =>
  execFileSync(command, args, {
    cwd,
    env: { ...env, ...extraEnv },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
const clone = (label) => {
  const root = join(dir, label);
  run(source, "git", ["clone", "--shared", "--no-checkout", source, root]);
  run(root, "git", ["checkout", "--detach", base]);
  return root;
};
const installFilters = [
  "--filter=.",
  "--filter=@assistant-ui/react-devtools...",
];
const tasks = (json) =>
  json.tasks
    .filter((task) => task.command && task.command !== "<NONEXISTENT>")
    .map(({ taskId, command, dependencies }) => ({
      taskId,
      command,
      dependencies,
    }))
    .sort((a, b) => a.taskId.localeCompare(b.taskId));
const commands =
  scenario === "empty-apps"
    ? [
        [
          "run",
          "build",
          `--filter=...[${base}]`,
          "--filter=!./packages/*",
          "--filter=!./api-surface",
          "--filter=!@assistant-ui/docs",
          "--filter=!./examples/*",
        ],
        ["run", "build", `--filter={./examples/*}[${base}]`],
      ]
    : [["run", "typecheck", `--filter=...[${base}]`]];
const hash = (text) => createHash("sha256").update(text).digest("hex");
const results = [];
const order =
  repeat % 2
    ? ["baseline", "candidate", "candidate", "baseline"]
    : ["candidate", "baseline", "baseline", "candidate"];
const plannerRoot = join(dir, "planner-tests");
for (const path of [
  "scripts/ci-has-tasks.mjs",
  "scripts/ci-has-tasks.test.mjs",
  ".github/workflows/code-quality.yaml",
]) {
  const destination = join(plannerRoot, path);
  mkdirSync(join(destination, ".."), { recursive: true });
  writeFileSync(
    destination,
    run(source, "git", ["show", `48f8b77d3a:${path}`], true),
  );
}
for (const [iteration, mode] of order.entries()) {
  const root = clone(`${mode}-${iteration}`);
  const store = join(dir, `store-${mode}-${iteration}`);
  env.PNPM_CONFIG_STORE_DIR = store;
  let names = [];
  let seed;
  if (
    scenario.startsWith("size") ||
    scenario === "changesets" ||
    scenario === "empty-apps"
  ) {
    seed = clone(`seed-${mode}-${iteration}`);
    run(seed, "pnpm", ["install", "--frozen-lockfile"]);
  }
  if (scenario.startsWith("size")) {
    const { SIZE_IGNORE } = await import(
      pathToFileURL(join(seed, "packages/x-performance/lib/size.mjs"))
    );
    names =
      scenario === "size-one"
        ? ["@assistant-ui/tap"]
        : readdirSync(join(root, "packages"), { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .flatMap((entry) => {
              const pkg = JSON.parse(
                readFileSync(
                  join(root, "packages", entry.name, "package.json"),
                  "utf8",
                ),
              );
              return pkg.private || SIZE_IGNORE.has(pkg.name) ? [] : [pkg.name];
            });
  }
  if (scenario.endsWith("plan") || scenario.startsWith("empty")) {
    const file =
      scenario === "nonempty-plan"
        ? "packages/tap/src/index.ts"
        : scenario === "empty-apps"
          ? "packages/mcp-docs-server/src/index.ts"
          : "scripts/check-built-declarations.test.mjs";
    appendFileSync(
      join(root, file),
      "\n// CI preparation benchmark fixture.\n",
    );
    run(root, "git", ["add", file]);
    run(root, "git", [
      "-c",
      "user.name=CI Benchmark",
      "-c",
      "user.email=ci@example.invalid",
      "commit",
      "-m",
      "test: preparation fixture",
    ]);
  }
  if (scenario === "changesets" && mode === "candidate") {
    const file = join(root, "package.json");
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace(
        "pnpm install --no-frozen-lockfile",
        "pnpm install --no-frozen-lockfile --lockfile-only",
      ),
    );
  }
  const start = performance.now();
  let plan;
  let planningMs = 0;
  if (
    (scenario.startsWith("empty") || scenario.endsWith("plan")) &&
    mode === "candidate"
  ) {
    run(plannerRoot, "node", ["--test", "scripts/ci-has-tasks.test.mjs"]);
    const selected = commands.map((args) =>
      run(
        root,
        "node",
        [join(plannerRoot, "scripts/ci-has-tasks.mjs"), base, ...args.slice(1)],
        true,
      ).trim(),
    );
    assert.ok(selected.every((value) => value === "true" || value === "false"));
    if (selected.every((value) => value === "false"))
      plan = commands.map(() => []);
    planningMs = performance.now() - start;
  }
  const needsInstall = !plan || plan.some((list) => list.length > 0);
  let installMs = 0;
  if (needsInstall) {
    const t = performance.now();
    const filters = scenario.startsWith("size")
      ? mode === "candidate"
        ? [...installFilters, ...names.map((n) => `--filter=${n}...`)]
        : []
      : scenario === "changesets"
        ? mode === "candidate"
          ? [...installFilters, "--filter=@assistant-ui/x-changelog..."]
          : []
        : scenario === "empty-apps"
          ? []
          : [...installFilters, `--filter=...[${base}]...`];
    run(root, "pnpm", ["install", "--frozen-lockfile", ...filters]);
    installMs = performance.now() - t;
  }
  let output;
  let workMs = 0;
  if (scenario === "changesets") {
    const t = performance.now();
    run(root, "pnpm", ["ci:version"]);
    workMs = performance.now() - t;
    if (mode === "candidate") {
      const file = join(root, "package.json");
      writeFileSync(
        file,
        readFileSync(file, "utf8").replace(
          "pnpm install --no-frozen-lockfile --lockfile-only",
          "pnpm install --no-frozen-lockfile",
        ),
      );
    }
    output = hash(run(root, "git", ["diff", "--binary"], true));
  } else if (scenario.startsWith("size")) {
    const t = performance.now();
    run(root, join(root, "node_modules/.bin/turbo"), [
      "run",
      "build",
      "--output-logs=errors-only",
      ...names.map((n) => `--filter=${n}`),
    ]);
    const { measurePackages } = await import(
      pathToFileURL(join(seed, "packages/x-performance/lib/size.mjs"))
    );
    output = hash(
      JSON.stringify([...(await measurePackages(root, names))].sort()),
    );
    workMs = performance.now() - t;
  } else if (needsInstall) {
    const installedPlan = commands.map((args) =>
      tasks(
        JSON.parse(
          run(
            root,
            join(root, "node_modules/.bin/turbo"),
            [...args, "--dry=json"],
            true,
          ),
        ),
      ),
    );
    if (plan) assert.deepEqual(plan, installedPlan);
    plan = installedPlan;
    output = hash(JSON.stringify(plan));
  } else output = hash(JSON.stringify(plan));
  const result = {
    scenario,
    repeat,
    iteration,
    mode,
    planningMs,
    installMs,
    workMs,
    totalMs: performance.now() - start,
    output,
    tasks: plan?.flat().length,
    names,
  };
  console.log(`BENCH_RESULT ${JSON.stringify(result)}`);
  results.push(result);
}
for (const result of results)
  assert.equal(
    result.output,
    results[0].output,
    "baseline and candidate outputs differ",
  );
writeFileSync(
  join(process.env.RUNNER_TEMP, "preparation-result.json"),
  JSON.stringify(results, null, 2),
);
