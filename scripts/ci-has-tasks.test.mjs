import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { hasTasks } from "./ci-has-tasks.mjs";

function fixture(tasks, failAt) {
  const calls = [];
  const exec = (command, args, options) => {
    calls.push({ command, args, options });
    if (calls.length === failAt) throw new Error("unavailable");
    if (command === "git") return "";
    if (args.includes("list"))
      return JSON.stringify([
        { devDependencies: { turbo: { version: "2.11.5" } } },
      ]);
    return JSON.stringify({ tasks });
  };
  return { calls, exec };
}

test("skips only an empty graph or tasks without commands", () => {
  for (const tasks of [[], [{ command: "<NONEXISTENT>" }]]) {
    assert.equal(
      hasTasks(
        "HEAD^1",
        ["typecheck", "--filter=...[HEAD^1]"],
        fixture(tasks).exec,
      ),
      false,
    );
  }
});

test("keeps executable dependency tasks and cache hits", () => {
  for (const tasks of [
    [{ command: "tsc --noEmit", cache: { status: "HIT" } }],
    [{ command: "<NONEXISTENT>" }, { command: "aui-build" }],
    [{}],
  ])
    assert.equal(hasTasks("HEAD^1", ["typecheck"], fixture(tasks).exec), true);
});

test("uses the locked Turbo version with the exact execution filters", () => {
  const { exec, calls } = fixture([]);
  const args = ["build", "--filter=...[origin/main]", "--filter=!./packages/*"];
  assert.equal(hasTasks("origin/main", args, exec), false);
  assert.deepEqual(
    { command: calls[2].command, args: calls[2].args },
    {
      command: "pnpm",
      args: ["dlx", "turbo@2.11.5", "run", ...args, "--dry=json"],
    },
  );
  assert.equal(calls[2].options.timeout, 120_000);
  assert.equal(calls[0].options.timeout, 30_000);
  assert.ok(calls[0].args.includes("packages"));
});

test("runs normally after workspace changes, missing refs, or planner failures", () => {
  for (const failAt of [1, 2, 3]) {
    const { exec, calls } = fixture([], failAt);
    assert.equal(hasTasks("missing", ["typecheck"], exec), true);
    assert.equal(calls.length, failAt);
  }
});

test("runs normally for missing or malformed planner output", () => {
  for (const output of [
    "garbage",
    "{}",
    '{"tasks":null}',
    '{"tasks":[null]}',
  ]) {
    const { exec } = fixture([]);
    assert.equal(
      hasTasks("HEAD^1", ["typecheck"], (command, args) =>
        args.includes("dlx") ? output : exec(command, args),
      ),
      true,
    );
  }
});

test("runs normally when the locked Turbo version cannot be read", () => {
  for (const output of [
    "garbage",
    "null",
    "[]",
    "[{}]",
    JSON.stringify([{ devDependencies: { turbo: {} } }]),
    JSON.stringify([
      { devDependencies: { turbo: { version: "workspace:*" } } },
    ]),
  ]) {
    const { exec, calls } = fixture([]);
    assert.equal(
      hasTasks("HEAD^1", ["typecheck"], (command, args, options) =>
        args.includes("list") ? output : exec(command, args, options),
      ),
      true,
    );
    assert.ok(!calls.some(({ args }) => args.includes("dlx")));
  }
});

test("workspace changes avoid planner overhead without skipping checks", () => {
  const { exec, calls } = fixture([], 1);
  assert.equal(hasTasks("HEAD^1", ["typecheck"], exec), true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args.slice(5), [
    "packages",
    "apps",
    "examples",
    "templates",
    "scripts/ci-has-tasks.mjs",
    "scripts/ci-has-tasks.test.mjs",
    ".github/workflows/code-quality.yaml",
  ]);
});

test("only typecheck gates installation and the app bundle check retains dependencies", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/code-quality.yaml", import.meta.url),
    "utf8",
  );
  const block = (job) =>
    workflow.split(`\n  ${job}:\n`)[1].split(/\n  [\w-]+:\n/)[0];
  const typecheck = block("typecheck");
  assert.ok(!typecheck.split("    steps:")[0].includes("if:"));
  for (const step of ["Install dependencies", "Typecheck"])
    assert.match(
      typecheck,
      new RegExp(
        `- name: ${step}\\n\\s+if: steps\\.tasks\\.outputs\\.run == 'true'`,
      ),
    );
  const apps = block("build-apps");
  const gate = "steps.app_build_inputs.outputs.run == 'true'";
  for (const step of [
    "Install dependencies",
    "Build apps",
    "Verify standalone example bundle contracts",
  ]) {
    const afterName = apps.split(`- name: ${step}\n`)[1];
    assert.equal(afterName.trimStart().split("\n")[0], `if: ${gate}`);
  }
  assert.equal(
    workflow.split("run: node --test scripts/ci-has-tasks.test.mjs").length - 1,
    1,
  );
  assert.match(apps, /run: pnpm test:bundles/);
});
