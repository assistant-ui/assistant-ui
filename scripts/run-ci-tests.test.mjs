import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runCiTests } from "./run-ci-tests.mjs";

const task = (name, status = "MISS") => ({
  taskId: `${name}#test`,
  task: "test",
  command: "vitest run",
  cache: { status },
});
const a = task("a");
const b = task("b");
const full = [a, b];

function execute({
  selected = full,
  all = full,
  cpus = 4,
  failure,
  exit = 0,
} = {}) {
  const calls = [];
  const env = {
    REDIS_URL: "redis://localhost:6379",
    TURBO_TOKEN: "test-token",
  };
  const filters = ["--filter=...[origin/main]"];
  const status = runCiTests(filters, {
    cpus,
    env,
    run(command, args, options) {
      calls.push({ command, args, options });
      if (!args.includes("--dry=json")) return { status: exit };
      if (failure) return failure;
      return {
        status: 0,
        stdout: JSON.stringify({
          tasks: args.includes(filters[0]) ? selected : all,
        }),
      };
    },
  });
  const actual = calls.at(-1);
  assert.equal(actual.command, "pnpm");
  assert.deepEqual(actual.args.slice(0, 4), ["exec", "turbo", "run", "test"]);
  assert.deepEqual(actual.args.slice(5), filters);
  assert.equal(actual.options.env.REDIS_URL, env.REDIS_URL);
  assert.equal(actual.options.env.TURBO_TOKEN, env.TURBO_TOKEN);
  assert.equal(actual.options.stdio, "inherit");
  return { calls, actual, status };
}

test("full uncached suites use the measured four-CPU worker budget", () => {
  const build = { taskId: "a#build", task: "build", command: "aui-build" };
  const absent = { ...task("empty"), command: "<NONEXISTENT>" };
  const { calls, actual, status } = execute({
    selected: [build, b, absent, a],
  });
  assert.equal(calls.length, 3);
  assert.equal(actual.args[4], "--concurrency=2");
  assert.equal(actual.options.env.VITEST_MAX_WORKERS, "2");
  assert.equal(status, 0);
});

test("partial, empty, and partly cached selections keep serial scheduling", () => {
  for (const selected of [[], [a], [a, task("other")], [a, task("b", "HIT")]]) {
    const { actual } = execute({ selected });
    assert.equal(actual.args[4], "--concurrency=1");
    assert.equal(actual.options.env.VITEST_MAX_WORKERS, undefined);
  }
});

test("unmeasured runner sizes keep the existing schedule without planning", () => {
  for (const cpus of [2, 8]) {
    const { actual, calls } = execute({ cpus });
    assert.equal(actual.args[4], "--concurrency=1");
    assert.equal(calls.length, 1);
  }
});

test("serial fallback preserves an existing worker override", () => {
  let actual;
  runCiTests([], {
    cpus: 2,
    env: { VITEST_MAX_WORKERS: "3" },
    run(_command, _args, options) {
      actual = options;
      return { status: 0 };
    },
  });
  assert.equal(actual.env.VITEST_MAX_WORKERS, "3");
});

test("a failed or malformed plan falls back without skipping tests", () => {
  for (const failure of [
    { status: 1, stdout: "" },
    { status: 0, stdout: "not JSON" },
    { status: 0, stdout: "{}" },
  ]) {
    const { actual, status } = execute({ failure, exit: 5 });
    assert.equal(actual.args[4], "--concurrency=1");
    assert.equal(status, 5);
  }
});

test("parallel test failures retain their exit status", () => {
  assert.equal(execute({ exit: 7 }).status, 7);
  assert.equal(execute({ exit: null }).status, 1);
});

test("CI keeps native selection, Redis, compiler tests, and worker passthrough", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/code-quality.yaml", import.meta.url),
    "utf8",
  );
  for (const file of [
    "scripts/run-ci-tests.mjs",
    "scripts/run-ci-tests.test.mjs",
  ]) {
    assert.equal(workflow.split(`      - "${file}"`).length - 1, 2);
  }
  assert.match(workflow, /node --test scripts\/run-ci-tests\.test\.mjs/);
  assert.match(
    workflow,
    /node scripts\/run-ci-tests\.mjs --filter="\.\.\.\[origin\/\$\{\{ github\.base_ref \}\}\]"/,
  );
  assert.match(
    workflow,
    /node scripts\/run-ci-tests\.mjs --filter="\.\.\.\[HEAD\^1\]"/,
  );
  assert.match(workflow, /REDIS_URL: redis:\/\/127\.0\.0\.1:6379/);
  assert.match(workflow, /run: pnpm test:react-compiler/);
  const config = JSON.parse(
    readFileSync(new URL("../turbo.json", import.meta.url), "utf8"),
  );
  assert.ok(config.tasks.test.passThroughEnv.includes("VITEST_MAX_WORKERS"));
  assert.deepEqual(config.tasks.test.dependsOn, ["^build"]);
  assert.notEqual(config.tasks.test.cache, false);
});
