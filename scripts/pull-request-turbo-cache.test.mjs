import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const workflow = (name) =>
  readFileSync(path.join(root, ".github/workflows", name), "utf8");
const steps = (text) => text.split(/^      - /m).slice(1);
const field = (step, name) =>
  step.match(new RegExp(`^ {8,10}${name}: (.+)$`, "m"))?.[1];
const jobSteps = (text, job) => {
  const body = text.split(new RegExp(`^  ${job}:\\n`, "m"))[1];
  assert(body, `job ${job}`);
  return steps(body.split(/^  [a-z-]+:\n/m)[0]);
};

const coverage = workflow("test-coverage.yaml");
const save = steps(coverage).find((step) =>
  step.startsWith("name: Save the Turbo cache for pull requests\n"),
);
assert(save);
const saveKey = field(save, "key");
const shards = coverage
  .match(/^ {8}shard: \[(.+)\]$/m)?.[1]
  .split(",")
  .map((shard) => shard.trim());

const jobs = [
  ["code-quality.yaml", "build", "Build packages"],
  ["code-quality.yaml", "typecheck", "Typecheck"],
  ["autofix.yaml", "autofix", "Update API surface snapshots"],
];

for (const [file, job, turboStep] of jobs) {
  test(`${job} restores every coverage shard's Turbo cache on pull requests before ${turboStep}`, () => {
    assert(saveKey?.includes("${{ matrix.shard }}"));
    assert(shards?.length);
    const all = jobSteps(workflow(file), job);
    const names = all.map((step) => step.match(/^name: (.+)$/m)?.[1]);
    const turbo = names.indexOf(turboStep);
    assert.notEqual(turbo, -1);
    for (const shard of shards) {
      const index = names.indexOf(
        `Restore main's coverage Turbo cache, shard ${shard}`,
      );
      assert.notEqual(index, -1, `shard ${shard}`);
      assert(index < turbo);
      const restore = all[index];
      assert.match(
        field(restore, "if"),
        /^github\.event_name == 'pull_request'( &&|$)/,
      );
      assert.match(field(restore, "uses"), /^actions\/cache\/restore@/);
      assert.equal(field(restore, "path"), ".turbo/cache");
      const key = saveKey.replace("${{ matrix.shard }}", shard);
      assert.equal(field(restore, "key"), key);
      assert.equal(
        field(restore, "restore-keys"),
        key.replace("${{ github.sha }}", ""),
      );
    }
  });
}

test("workflows that restore main's coverage cache never save a cache", () => {
  for (const file of new Set(jobs.map(([file]) => file))) {
    assert.doesNotMatch(workflow(file), /actions\/cache(\/save)?@/, file);
  }
});
