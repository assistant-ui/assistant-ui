import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { workspaceInputs } from "./deploy-examples-changes.mjs";
import { readJson } from "./lib/workspace.mjs";

const root = path.resolve(import.meta.dirname, "..");
const example = path.join(root, "examples/with-pydantic-ai-durable");
const pkg = readJson(path.join(example, "package.json"));
const workflow = readFileSync(
  path.join(root, ".github/workflows/durable-example-tests.yaml"),
  "utf8",
);

for (const event of ["pull_request", "push"]) {
  test(`${event}: durable server tests watch their dependency graph`, () => {
    const block = workflow.match(
      new RegExp(`^  ${event}:\\n[\\s\\S]*?(?=^  \\w+:|^\\S)`, "m"),
    );
    assert.ok(block, event);
    const paths = [...block[0].matchAll(/^      - "(.+)"$/gm)].map(
      (match) => match[1],
    );
    const runsFor = (file) =>
      paths.reduce((included, pattern) => {
        const negative = pattern.startsWith("!");
        return path.posix.matchesGlob(
          file,
          negative ? pattern.slice(1) : pattern,
        )
          ? !negative
          : included;
      }, false);
    for (const file of [
      "examples/with-pydantic-ai-durable/lib/durable-agent.ts",
      "examples/with-pydantic-ai-durable/lib/durable-agent.e2e.test.tsx",
      "examples/with-pydantic-ai-durable/server/main.py",
      "examples/with-pydantic-ai-durable/server/uv.lock",
      "python/assistant-stream/assistant_stream/pydantic_ai.py",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "turbo.json",
      ".github/workflows/durable-example-tests.yaml",
      "scripts/durable-example-tests.test.mjs",
      "scripts/deploy-examples-changes.mjs",
      "scripts/lib/workspace.mjs",
      ...workspaceInputs(root, pkg).map(
        (directory) => `${directory}/src/index.ts`,
      ),
    ]) {
      assert.equal(runsFor(file), true, file);
    }
    for (const file of [
      "README.md",
      "apps/docs/app/page.tsx",
      "examples/with-expo/app/index.tsx",
      "python/assistant-ui-sync-server-api/pyproject.toml",
    ]) {
      assert.equal(runsFor(file), false, file);
    }
  });
}

test("normal and server-backed commands discover every durable suite once", () => {
  const filesFor = (command) => {
    assert.match(command, /^vitest run(?: |$)/);
    const args = command.split(" ").slice(2);
    return JSON.parse(
      execFileSync(
        process.execPath,
        [
          path.join(root, "node_modules/vitest/vitest.mjs"),
          "list",
          ...args,
          "--filesOnly",
          "--json",
        ],
        { cwd: example, encoding: "utf8" },
      ),
    ).map(({ file }) => path.relative(example, file).split(path.sep).join("/"));
  };
  const normal = filesFor(pkg.scripts.test);
  const server = filesFor(pkg.scripts["test:e2e"]);
  const files = globSync("lib/**/*.test.{ts,tsx}", { cwd: example })
    .map((file) => file.split(path.sep).join("/"))
    .toSorted();
  assert.ok(normal.length > 0 && server.length > 0);
  assert.deepEqual(
    normal.toSorted(),
    files.filter((file) => !file.includes(".e2e.test.")),
  );
  assert.deepEqual(
    server.toSorted(),
    files.filter((file) => file.includes(".e2e.test.")),
  );
});

test("the server job provisions Python and executes the real suite", () => {
  const steps = workflow.split(/^      - name: /m).slice(1);
  const setup = steps.findIndex((step) =>
    step.includes("uses: astral-sh/setup-uv@"),
  );
  const install = steps.findIndex((step) =>
    step.includes("run: uv sync --locked"),
  );
  const run = steps.findIndex((step) =>
    step.includes("run: pnpm --filter with-pydantic-ai-durable test:e2e"),
  );
  assert.ok(setup >= 0 && install > setup && run > install);
  assert.match(steps[setup], /python-version: "3\.12"/);
  assert.match(
    steps[install],
    /working-directory: examples\/with-pydantic-ai-durable\/server/,
  );
  assert.doesNotMatch(steps[run], /continue-on-error: true|if:/);
});
