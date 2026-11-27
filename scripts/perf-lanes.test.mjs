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
import test from "node:test";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const workflow = readFileSync(
  path.join(root, ".github/workflows/perf.yaml"),
  "utf8",
);
const selection = workflow
  .split("        id: lanes\n")[1]
  .split("        run: |\n")[1]
  .split("\n      - name:")[0];
const unit = "packages/core/src/react/utils/groupParts.test.ts";
const source = "packages/core/src/react/utils/groupParts.ts";
const cases = [
  [
    "colocated unit tests",
    [],
    [unit, "packages/react/src/thread.test.tsx"],
    false,
    false,
  ],
  ["mixed production and test", [], [unit, source], true, false],
  ["production renamed to test", [source], [unit], true, false],
  ["deleted production file", [source], [], true, false],
  [
    "package fixture",
    [],
    ["packages/core/src/__fixtures__/message.json"],
    true,
    false,
  ],
  [
    "colocated benchmark",
    [],
    ["packages/core/src/groupParts.bench.ts"],
    true,
    false,
  ],
  [
    "toolkit test",
    [],
    ["packages/x-performance/src/render-counter.test.tsx"],
    true,
    false,
  ],
  [
    "trace fixture",
    [],
    ["packages/x-performance/fixtures/shimmer.html"],
    true,
    true,
  ],
  [
    "trace package and unit test",
    [],
    ["packages/tw-shimmer/index.css", unit],
    false,
    true,
  ],
  ["workflow", [], [".github/workflows/perf.yaml"], true, true],
];

for (const [name, before, after, bench, trace] of cases) {
  test(name, (t) => {
    const cwd = mkdtempSync(path.join(tmpdir(), "aui-perf-lanes-"));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));
    const git = (...args) =>
      execFileSync(
        "git",
        [
          "-c",
          "core.hooksPath=/dev/null",
          "-c",
          "user.name=Test",
          "-c",
          "user.email=test@example.org",
          ...args,
        ],
        { cwd, encoding: "utf8" },
      ).trim();
    const commit = (files) => {
      for (const file of files) {
        mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
        writeFileSync(path.join(cwd, file), "fixture\n");
      }
      git("add", ".");
      git("commit", "--allow-empty", "-qm", "fixture");
    };
    git("init", "-q");
    commit(before);
    const base = git("rev-parse", "HEAD");
    for (const file of before) rmSync(path.join(cwd, file));
    commit(after);
    const output = path.join(cwd, ".git", "lanes");
    execFileSync("bash", ["-c", selection], {
      cwd: root,
      env: {
        ...process.env,
        GIT_DIR: path.join(cwd, ".git"),
        GIT_WORK_TREE: cwd,
        BASE_SHA: base,
        GITHUB_OUTPUT: output,
      },
    });
    assert.equal(
      readFileSync(output, "utf8"),
      `bench=${bench}\ntrace=${trace}\n`,
    );
  });
}

test("a test-only rerun skips measurement and reconciles its sticky report", () => {
  const steps = workflow.split(/^      - name: /m).slice(1);
  const outputs = { bench: "false", trace: "false" };
  const enabled = steps.filter((step) => {
    const condition = step.match(/^        if: (.+)$/m)?.[1];
    return (
      !condition ||
      runInNewContext(condition, { steps: { lanes: { outputs } } })
    );
  });
  assert.deepEqual(
    enabled.map((step) => step.split("\n")[0]),
    [
      "Checkout code repository",
      "Test performance routing",
      "Decide which lanes the change touches",
      "Update the sticky PR report",
    ],
  );
});
