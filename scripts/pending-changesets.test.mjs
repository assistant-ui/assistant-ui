import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

for (const [workflow, step] of [
  ["npm-publish", "Validate no pending changesets"],
  ["registry", "Validate the packages are published"],
]) {
  test(`${workflow} checks pending changesets in a release without the helper`, (t) => {
    const yaml = readFileSync(
      new URL(`../.github/workflows/${workflow}.yaml`, import.meta.url),
      "utf8",
    );
    const block = yaml
      .split(`      - name: ${step}\n`)[1]
      .split("\n      - name:")[0];
    const script = block.split("          script: |\n")[1];
    assert.ok(script, step);
    const root = mkdtempSync(path.join(tmpdir(), "aui-release-gate-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const tools = path.join(root, ".github/release-tools/scripts");
    mkdirSync(tools, { recursive: true });
    copyFileSync(
      new URL("./pending-changesets.mjs", import.meta.url),
      path.join(tools, "pending-changesets.mjs"),
    );
    mkdirSync(path.join(root, "packages"));
    const dir = path.join(root, ".changeset");
    mkdirSync(path.join(dir, "pre"), { recursive: true });

    function check(expectedExitCode) {
      const result = spawnSync(
        process.execPath,
        [
          "-e",
          `const core = {
            info: console.log,
            setFailed(message) {
              console.error(message);
              process.exitCode = 1;
            },
          };
          (async () => { ${script} })();`,
        ],
        {
          cwd: root,
          env: { ...process.env, GITHUB_WORKSPACE: root },
          encoding: "utf8",
        },
      );
      assert.equal(result.status, expectedExitCode, result.stderr);
      if (expectedExitCode === 1)
        assert.match(result.stderr, /pending changesets/);
    }

    check(0);
    writeFileSync(path.join(dir, "ordinary.md"), "---\n---\n");
    check(1);
    rmSync(path.join(dir, "ordinary.md"));
    writeFileSync(path.join(dir, "AGENTS.md"), "");
    check(0);
    rmSync(path.join(dir, "AGENTS.md"));
    writeFileSync(path.join(dir, "pre/early.md"), "---\n---\n");
    check(1);
    preMode(root, "pre");
    check(0);
    preMode(root, "exit");
    check(1);
  });
}
