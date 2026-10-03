import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { hasTasks } from "./ci-has-tasks.mjs";

function fixture(tasks, failAt) {
  const calls = [];
  const exec = (command, args) => {
    calls.push({ command, args });
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
  assert.deepEqual(calls[2], {
    command: "pnpm",
    args: ["dlx", "turbo@2.11.5", "run", ...args, "--dry=json"],
  });
  assert.ok(calls[0].args.includes("pnpm-lock.yaml"));
  assert.ok(calls[0].args.includes("packages/x-buildutils"));
});

test("runs normally after shared input changes, missing refs, or planner failures", () => {
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

test("the workflow keeps both jobs visible and gates their install and execution", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/code-quality.yaml", import.meta.url),
    "utf8",
  );
  for (const job of ["build-apps", "typecheck"]) {
    const block = workflow.split(`\n  ${job}:\n`)[1].split(/\n  [\w-]+:\n/)[0];
    assert.ok(!block.split("    steps:")[0].includes("if:"));
    assert.match(block, /run: node --test scripts\/ci-has-tasks.test.mjs/);
    assert.match(
      block,
      /- name: Install dependencies\n        if: .*steps\.tasks\.outputs\.run == 'true'/,
    );
    assert.match(
      block,
      /- name: (?:Build apps|Typecheck)\n        if: .*steps\.tasks\.outputs\.run == 'true'/,
    );
  }
});
