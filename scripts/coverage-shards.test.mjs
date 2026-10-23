import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { coverageShards } from "./coverage-shards.mjs";

function workspace(t, packages) {
  const root = mkdtempSync(path.join(tmpdir(), "coverage-shards-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    path.join(root, "pnpm-workspace.yaml"),
    'packages:\n  - "packages/*"\n',
  );
  for (const { name, tests, coverage = true } of packages) {
    const dir = path.join(root, "packages", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name,
        scripts: coverage ? { "test:coverage": "node --test" } : {},
      }),
    );
    for (let i = 0; i < tests; i++)
      writeFileSync(path.join(dir, `${i}.test.ts`), "");
  }
  return root;
}

test("each coverage workspace runs once, including workspaces without colocated tests", (t) => {
  const root = workspace(t, [
    { name: "large", tests: 10 },
    { name: "medium", tests: 8 },
    { name: "small", tests: 2 },
    { name: "external", tests: 0 },
    { name: "build-only", tests: 5, coverage: false },
  ]);
  const shards = coverageShards(root);
  assert.deepEqual(shards.flat().sort(), [
    "external",
    "large",
    "medium",
    "small",
  ]);
  assert.notEqual(
    shards.findIndex((s) => s.includes("large")),
    shards.findIndex((s) => s.includes("medium")),
  );
  assert.deepEqual(coverageShards(root), shards);
});

test("installed dependency tests do not affect shard assignment", (t) => {
  const root = workspace(t, [
    { name: "a", tests: 4 },
    { name: "b", tests: 3 },
    { name: "c", tests: 2 },
  ]);
  const before = coverageShards(root);
  const installed = path.join(root, "packages/c/node_modules/dependency");
  mkdirSync(installed, { recursive: true });
  for (let i = 0; i < 10; i++)
    writeFileSync(path.join(installed, `${i}.test.ts`), "");
  assert.deepEqual(coverageShards(root), before);
});

test("the CLI emits the selected shard filters and rejects invalid shard indexes", () => {
  const script = new URL("./coverage-shards.mjs", import.meta.url);
  for (const index of [0, 1]) {
    const output = execFileSync(
      process.execPath,
      [script.pathname, String(index)],
      { encoding: "utf8" },
    );
    assert.deepEqual(
      output.trim().split("\n"),
      coverageShards()[index].map((name) => `--filter=${name}`),
    );
  }
  assert.throws(() =>
    execFileSync(process.execPath, [script.pathname, "2"], { stdio: "pipe" }),
  );
});
