import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  WORKFLOW_FILE,
  allInputs,
  exampleInputs,
  planDeploys,
} from "./deploy-examples-changes.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const script = path.join(repoRoot, "scripts/deploy-examples-changes.mjs");

const examplesOf = (plan) => plan.matrix.include.map((entry) => entry.example);

test("each example's inputs follow its workspace dependency graph", () => {
  const expo = exampleInputs(repoRoot, "with-expo");
  for (const input of [
    "examples/with-expo",
    "packages/react-native",
    "packages/ui",
    "packages/metro",
    "packages/ai-sdk",
    "packages/core",
    "packages/store",
    "packages/tap",
    "packages/assistant-stream",
    "packages/x-buildutils",
    WORKFLOW_FILE,
  ]) {
    assert.ok(expo.includes(input), `with-expo should watch ${input}`);
  }
  assert.ok(!expo.includes("packages/react-ink"));

  const ink = exampleInputs(repoRoot, "with-react-ink-web");
  for (const input of [
    "examples/with-react-ink-web",
    "packages/react-ink",
    "packages/react-ink-markdown",
    "packages/core",
    "packages/tap",
  ]) {
    assert.ok(ink.includes(input), `with-react-ink-web should watch ${input}`);
  }
  for (const input of [
    "packages/react-native",
    "packages/ui",
    "packages/metro",
  ]) {
    assert.ok(
      !ink.includes(input),
      `with-react-ink-web should not watch ${input}`,
    );
  }
});

test("a change selects only the examples it feeds", () => {
  assert.deepEqual(
    examplesOf(
      planDeploys(repoRoot, ["packages/ui/src/components/react-native/x.tsx"]),
    ),
    ["with-expo"],
  );
  assert.deepEqual(
    examplesOf(planDeploys(repoRoot, ["packages/react-ink/src/index.ts"])),
    ["with-react-ink-web"],
  );
  assert.deepEqual(
    examplesOf(planDeploys(repoRoot, ["packages/tap/src/index.ts"])),
    ["with-expo", "with-react-ink-web"],
  );
  assert.deepEqual(
    examplesOf(planDeploys(repoRoot, ["packages/uiwidgets/index.ts"])),
    [],
  );
  assert.deepEqual(planDeploys(repoRoot, ["apps/docs/content/x.mdx"]), {
    matrix: { include: [] },
    any: false,
  });
});

test("an unknown base deploys every example", () => {
  const plan = planDeploys(repoRoot, null);
  assert.deepEqual(examplesOf(plan), ["with-expo", "with-react-ink-web"]);
  assert.equal(
    plan.matrix.include[0]["chat-endpoint-url"],
    "https://www.assistant-ui.com/api/chat",
  );
  assert.equal(plan.any, true);
});

test("the CLI reads NUL separated paths and honours --all", () => {
  const piped = spawnSync(process.execPath, [script], {
    input: "examples/with-react-ink-web/app/page.tsx\0apps/docs/x.mdx\0",
    encoding: "utf8",
  });
  assert.equal(piped.status, 0, piped.stderr);
  assert.deepEqual(examplesOf(JSON.parse(piped.stdout)), [
    "with-react-ink-web",
  ]);

  const all = spawnSync(process.execPath, [script, "--all"], {
    encoding: "utf8",
  });
  assert.equal(all.status, 0, all.stderr);
  assert.deepEqual(examplesOf(JSON.parse(all.stdout)), [
    "with-expo",
    "with-react-ink-web",
  ]);
});

test("the workflow trigger paths are the union of the example inputs", () => {
  const workflow = readFileSync(path.join(repoRoot, WORKFLOW_FILE), "utf8");
  const block = workflow.match(/^    paths:\n((?:      - .*\n)+)/m);
  assert.ok(block, "paths block");
  const triggerPaths = block[1]
    .trim()
    .split("\n")
    .map((line) => line.replace(/^\s*- /, "").replace(/\/\*\*$/, ""))
    .sort();
  assert.deepEqual(triggerPaths, allInputs(repoRoot));
});
