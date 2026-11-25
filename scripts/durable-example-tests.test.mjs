import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { workspaceInputs } from "./deploy-examples-changes.mjs";
import { posixPath, readJson } from "./lib/workspace.mjs";

const root = path.resolve(import.meta.dirname, "..");
const example = path.join(root, "examples/with-pydantic-ai-durable");
const pkg = readJson(path.join(example, "package.json"));
const workflow = readFileSync(
  path.join(root, ".github/workflows/durable-example-tests.yaml"),
  "utf8",
);

function pathsFor(event) {
  const block = workflow.match(
    new RegExp(`^  ${event}:\\n[\\s\\S]*?(?=^  \\w+:|^\\S)`, "m"),
  );
  assert.ok(block, event);
  return [...block[0].matchAll(/^      - "(.+)"$/gm)].map((match) => match[1]);
}

for (const event of ["pull_request", "push"]) {
  test(`${event}: durable server tests watch their dependency graph`, () => {
    const paths = pathsFor(event);
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
    const readme = "examples/with-pydantic-ai-durable/README.md";
    assert.equal(runsFor(readme), false, readme);
    for (const file of [
      "examples/with-pydantic-ai-durable/lib/durable-agent.ts",
      "examples/with-pydantic-ai-durable/lib/durable-agent.e2e.test.tsx",
      "examples/with-pydantic-ai-durable/server/main.py",
      "examples/with-pydantic-ai-durable/server/test_origin_guard.py",
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
      assert.equal([readme, file].some(runsFor), true, file);
    }
    for (const file of [
      "README.md",
      "apps/docs/app/page.tsx",
      "examples/with-expo/app/index.tsx",
      "python/assistant-ui-sync-server-api/pyproject.toml",
      "packages/react/src/index.test.ts",
      "packages/react/src/index.test.tsx",
    ]) {
      assert.equal(runsFor(file), false, file);
    }
  });

  test(`${event}: durable server tests watch exactly their workspace packages`, () => {
    const paths = pathsFor(event);
    assert.deepEqual(
      paths
        .filter((pattern) => pattern.startsWith("packages/"))
        .map((pattern) => pattern.replace(/\/\*\*$/, ""))
        .sort(),
      workspaceInputs(root, pkg).map(posixPath),
    );
    const exclusions = ["!packages/**/*.test.ts", "!packages/**/*.test.tsx"];
    assert.deepEqual(
      paths.filter((pattern) => pattern.startsWith("!packages/")),
      exclusions,
    );
    const lastPackage = paths.findLastIndex((pattern) =>
      pattern.startsWith("packages/"),
    );
    for (const exclusion of exclusions) {
      assert.ok(paths.indexOf(exclusion) > lastPackage, exclusion);
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

test("the server job provisions Python and executes the real suites", () => {
  const steps = workflow.split(/^      - name: /m).slice(1);
  const setup = steps.findIndex((step) =>
    step.includes("uses: astral-sh/setup-uv@"),
  );
  const install = steps.findIndex((step) =>
    step.includes("run: uv sync --locked"),
  );
  const unit = steps.findIndex((step) =>
    step.includes("run: uv run --locked python -m unittest"),
  );
  const run = steps.findIndex((step) =>
    step.includes("run: pnpm --filter with-pydantic-ai-durable test:e2e"),
  );
  assert.ok(setup >= 0 && install > setup && unit > install && run > unit);
  assert.match(steps[setup], /python-version: "3\.12"/);
  for (const step of [steps[install], steps[unit]]) {
    assert.match(
      step,
      /working-directory: examples\/with-pydantic-ai-durable\/server/,
    );
  }
  for (const step of [steps[unit], steps[run]]) {
    assert.doesNotMatch(step, /continue-on-error: true|if:/);
  }
});
