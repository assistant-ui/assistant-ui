import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  needsRedisTestService,
  REDIS_TEST_PACKAGES,
} from "./test-redis-inputs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts/test-redis-inputs.mjs");

test("starts Redis for either consumer regardless of cache status", () => {
  for (const name of REDIS_TEST_PACKAGES) {
    for (const task of ["test", "test:coverage"]) {
      for (const status of ["HIT", "MISS", undefined]) {
        assert.equal(
          needsRedisTestService({
            tasks: [{ package: name, task, cache: { status } }],
          }),
          true,
        );
      }
    }
  }
});

test("does not start Redis for unrelated tests or consumer builds", () => {
  assert.equal(needsRedisTestService({ tasks: [] }), false);
  assert.equal(
    needsRedisTestService({
      tasks: [
        { package: "@assistant-ui/tap", task: "test" },
        { package: "@assistant-ui/mcp-docs-server", task: "test:coverage" },
        { package: "assistant-stream", task: "build" },
        { package: "@assistant-ui/docs", task: "generate:type-docs" },
      ],
    }),
    false,
  );
});

test("coverage selection does not change report or artifact collection", () => {
  const workflow = readFileSync(
    path.join(root, ".github/workflows/code-quality.yaml"),
    "utf8",
  );
  const job = workflow.match(/\n  coverage:\n([\s\S]*?)(?=\n  [\w-]+:)/)[1];
  assert.doesNotMatch(job, /\n    services:/);
  assert.match(job, /REDIS_URL: redis:\/\/127\.0\.0\.1:6379/);
  assert.match(job, /set -euo pipefail/);
  assert.match(
    job,
    /pnpm exec turbo run test:coverage --dry=json --filter="\.\.\.\[\$BASE\]" \| node scripts\/test-redis-inputs\.mjs/,
  );
  assert.match(job, /steps\.redis\.outputs\.run == 'true'/);
  assert.match(job, /docker exec aui-coverage-redis redis-cli ping/);
  assert.match(
    job,
    /pnpm turbo test:coverage --concurrency=1 --filter="\$FILTER"/,
  );
  assert.match(job, /Write the coverage summary\n        if: always\(\)/);
  assert.match(job, /Upload coverage reports\n        if: always\(\)/);
  assert.match(
    job,
    /Stop Redis\n        if: always\(\) && steps\.redis\.outputs\.run == 'true'/,
  );
  assert.match(job, /docker rm --force aui-coverage-redis/);
});

test("invalid task plans fail instead of silently skipping Redis", () => {
  for (const plan of [null, {}, { tasks: null }, { tasks: [{}] }]) {
    assert.throws(
      () => needsRedisTestService(plan),
      /Expected a Turbo task plan/,
    );
  }
  const result = spawnSync(process.execPath, [script], {
    input: "not JSON",
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
});

test("the CLI consumes Turbo JSON", () => {
  const result = spawnSync(process.execPath, [script], {
    input: JSON.stringify({
      tasks: [{ package: "assistant-stream", task: "test" }],
    }),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "true\n");
});

test("every tracked Redis test consumer is represented", () => {
  const files = execFileSync(
    "git",
    [
      "grep",
      "-l",
      "-z",
      "REDIS_URL",
      "--",
      "apps/**/*.test.*",
      "packages/**/*.test.*",
    ],
    { cwd: root, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
  const consumers = new Set(
    files.map((file) => {
      const workspace = file.split("/").slice(0, 2).join("/");
      return JSON.parse(
        readFileSync(path.join(root, workspace, "package.json"), "utf8"),
      ).name;
    }),
  );
  assert.deepEqual([...consumers].sort(), [...REDIS_TEST_PACKAGES].sort());
});

test("the workflow keeps selection, readiness, cleanup and test commands wired", () => {
  const workflow = readFileSync(
    path.join(root, ".github/workflows/code-quality.yaml"),
    "utf8",
  );
  const job = workflow.match(/\n  test:\n([\s\S]*?)(?=\n  [\w-]+:)/)[1];
  assert.doesNotMatch(job, /\n    services:/);
  assert.match(job, /REDIS_URL: redis:\/\/127\.0\.0\.1:6379/);
  assert.match(job, /set -euo pipefail/);
  assert.match(job, /node scripts\/test-redis-inputs\.mjs/);
  assert.match(
    job,
    /pnpm exec turbo run test --dry=json --filter="\.\.\.\[\$BASE\]"/,
  );
  assert.match(job, /steps\.redis\.outputs\.run == 'true'/);
  assert.match(job, /docker exec aui-test-redis redis-cli ping/);
  assert.match(job, /always\(\)/);
  assert.match(job, /docker rm --force aui-test-redis/);
  assert.match(job, /pnpm test:react-compiler/);
  for (const file of [
    "scripts/test-redis-inputs.mjs",
    "scripts/test-redis-inputs.test.mjs",
  ]) {
    assert.equal(workflow.split(`      - "${file}"`).length - 1, 2);
  }
});
