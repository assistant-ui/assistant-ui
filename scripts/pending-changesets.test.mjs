import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pendingChangesets } from "./pending-changesets.mjs";

const ignored = [
  "README.md",
  "readme.MD",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".draft.md",
  "config.json",
];

function changesetDir(files, { pre = true } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-pending-changesets-"));
  mkdirSync(path.join(root, ".changeset", ...(pre ? ["pre"] : [])), {
    recursive: true,
  });
  for (const file of [...ignored, ...files]) {
    writeFileSync(path.join(root, ".changeset", file), "---\n---\n");
  }
  return root;
}

const preMode = (root, mode) =>
  writeFileSync(
    path.join(root, ".changeset", "pre.json"),
    JSON.stringify({ mode, tag: "next", initialVersions: {}, changesets: [] }),
  );

test("counts changesets and skips the files changesets/action ignores", () => {
  const root = changesetDir(["brave-fox.md", "pre/early-bird.md"]);
  assert.deepEqual(pendingChangesets(root).toSorted(), [
    "brave-fox.md",
    "pre/early-bird.md",
  ]);
});

test("leaves out pre/ changesets in pre mode", () => {
  const root = changesetDir(["brave-fox.md", "pre/early-bird.md"]);
  preMode(root, "pre");
  assert.deepEqual(pendingChangesets(root), ["brave-fox.md"]);
});

test("keeps pre/ changesets once pre mode exits", () => {
  const root = changesetDir(["brave-fox.md", "pre/early-bird.md"]);
  preMode(root, "exit");
  assert.deepEqual(pendingChangesets(root).toSorted(), [
    "brave-fox.md",
    "pre/early-bird.md",
  ]);
});

test("finds none after a version PR consumed them", () => {
  assert.deepEqual(pendingChangesets(changesetDir([])), []);
});

test("works without a pre directory", () => {
  assert.deepEqual(
    pendingChangesets(changesetDir(["brave-fox.md"], { pre: false })),
    ["brave-fox.md"],
  );
});
