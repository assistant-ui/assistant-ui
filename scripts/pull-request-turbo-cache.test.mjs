import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
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
  [
    "code-quality.yaml",
    "build",
    "Build packages",
    "github.event_name == 'pull_request' && steps.package_build_inputs.outputs.run == 'true'",
  ],
  [
    "code-quality.yaml",
    "typecheck",
    "Typecheck",
    "github.event_name == 'pull_request' && steps.tasks.outputs.run == 'true'",
  ],
  [
    "code-quality.yaml",
    "build-apps",
    "Build apps",
    "github.event_name == 'pull_request' && steps.app_build_inputs.outputs.run == 'true'",
  ],
  [
    "autofix.yaml",
    "autofix",
    "Update API surface snapshots",
    "github.event_name == 'pull_request' && steps.turbo_cache.outputs.restore != 'false'",
  ],
  [
    "pkg-pr-new.yaml",
    "publish-preview",
    "Build packages",
    "github.event_name == 'pull_request'",
  ],
  [
    "template-metrics.yaml",
    "report",
    "Build templates (bundle subset)",
    "github.event_name == 'pull_request' && steps.bundles.outputs.run == 'true'",
  ],
  [
    "vscode-test-bed.yaml",
    "probes",
    "Build workspace packages",
    "github.event_name == 'pull_request'",
  ],
  [
    "expo-native-bundle.yaml",
    "bundle",
    "Build workspace packages",
    "github.event_name == 'pull_request'",
  ],
  [
    "durable-example-tests.yaml",
    "server",
    "Build workspace dependencies",
    "github.event_name == 'pull_request'",
  ],
];

for (const [file, job, turboStep, restoreGate] of jobs) {
  test(`${job} restores every coverage shard's Turbo cache on pull requests before ${turboStep}`, () => {
    assert(saveKey?.includes("${{ matrix.shard }}"));
    assert(shards?.length);
    const all = jobSteps(workflow(file), job);
    const names = all.map((step) => step.match(/^name: (.+)$/m)?.[1]);
    const turbo = names.indexOf(turboStep);
    assert.notEqual(turbo, -1);
    assert.equal(
      names.filter((name) =>
        name?.startsWith("Restore main's coverage Turbo cache, shard "),
      ).length,
      shards.length,
    );
    for (const shard of shards) {
      const index = names.indexOf(
        `Restore main's coverage Turbo cache, shard ${shard}`,
      );
      assert.notEqual(index, -1, `shard ${shard}`);
      assert(index < turbo);
      const restore = all[index];
      assert.equal(field(restore, "if"), restoreGate);
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

test("workflows that restore main's coverage cache never save a Turbo cache", () => {
  for (const file of new Set(jobs.map(([file]) => file))) {
    for (const step of steps(workflow(file))) {
      if (/^\s*uses:\s*actions\/cache(?:\/save)?@/m.test(step)) {
        assert.doesNotMatch(step, /\.turbo/, file);
      }
    }
  }
});

test("autofix skips restores only for docs content after lint", (t) => {
  const all = jobSteps(workflow("autofix.yaml"), "autofix");
  const index = all.findIndex((step) => field(step, "id") === "turbo_cache");
  const indexOf = (name) =>
    all.findIndex((step) => step.startsWith(`name: ${name}\n`));
  assert(indexOf("Lint fix") < index);
  for (const shard of shards)
    assert(
      index < indexOf(`Restore main's coverage Turbo cache, shard ${shard}`),
    );
  assert.equal(field(all[index], "if"), "github.event_name == 'pull_request'");
  assert.equal(
    field(all[indexOf("Update API surface snapshots")], "if"),
    undefined,
  );

  const cwd = mkdtempSync(path.join(tmpdir(), "autofix-cache-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd });
  git("init", "-q");
  const write = (file) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), "input");
    git("add", "--", file);
  };
  write("packages/core/src/index.ts");
  git(
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "-qm",
    "base",
  );
  const output = path.join(cwd, "output");
  const restores = (base = "HEAD") => {
    writeFileSync(output, "");
    execFileSync(
      "bash",
      ["-eo", "pipefail", "-c", all[index].split("        run: |\n")[1]],
      {
        cwd,
        env: { ...process.env, BASE: base, GITHUB_OUTPUT: output },
        stdio: "pipe",
      },
    );
    return !readFileSync(output, "utf8").split("\n").includes("restore=false");
  };
  write("apps/docs/content/blog/vs-code/index.mdx");
  write("apps/docs/content/blog/vs-code/vscode-extension.png");
  assert.equal(restores(), false);
  assert.equal(restores("missing-base"), true);
  for (const input of [
    "api-surface/core.ts",
    "pnpm-lock.yaml",
    "apps/docs/content-tools/config.json",
    "unknown-input",
  ]) {
    write(input);
    assert.equal(restores(), true, input);
    git("rm", "-qf", "--", input);
  }
  writeFileSync(path.join(cwd, "packages/core/src/index.ts"), "lint fix");
  assert.equal(restores(), true);
});
