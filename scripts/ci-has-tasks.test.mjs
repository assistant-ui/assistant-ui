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

test("typecheck wrapper changes cannot skip execution", () => {
  const { exec, calls } = fixture([]);
  assert.equal(
    hasTasks("HEAD^1", ["typecheck"], (command, args, options) => {
      if (command === "git" && args.includes("scripts/typecheck.sh")) {
        throw new Error("changed wrapper");
      }
      return exec(command, args, options);
    }),
    true,
  );
  assert.equal(calls.length, 0);
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
    "scripts/typecheck.sh",
    ".github/workflows/code-quality.yaml",
  ]);
});

test("typecheck installation and execution use the planner result", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/code-quality.yaml", import.meta.url),
    "utf8",
  );
  const typecheck = workflow
    .split("\n  typecheck:\n")[1]
    .split(/\n  [\w-]+:\n/)[0];
  const steps = typecheck.split(/\n\s+- name: /);
  for (const name of ["Install dependencies", "Typecheck"]) {
    const step = steps.find((value) => value.split("\n")[0] === name);
    assert.ok(step);
    assert.ok(
      step
        .split("\n")
        .some(
          (line) => line.trim() === "if: steps.tasks.outputs.run == 'true'",
        ),
    );
  }
});
