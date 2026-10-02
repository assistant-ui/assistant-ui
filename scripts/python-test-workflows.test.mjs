import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflows = [
  ["python-stream-tests.yaml", "assistant-stream"],
  ["python-sync-server-tests.yaml", "assistant-ui-sync-server-api"],
];
const readWorkflow = (name) =>
  readFileSync(
    new URL(`../.github/workflows/${name}`, import.meta.url),
    "utf8",
  );
const sharedInputs = [
  ".github/workflows/python-tests.yaml",
  ...workflows.map(([name]) => `.github/workflows/${name}`),
  "scripts/python-test-workflows.test.mjs",
];

const triggers = workflows.map(([file, pkg]) => {
  const source = readWorkflow(file);
  const blocks = [...source.matchAll(/    paths:\n((?:      - .*\n)+)/g)];
  assert.equal(blocks.length, 2, file);
  const paths = blocks.map((block) =>
    [...block[1].matchAll(/      - "([^"]+)"/g)].map((match) => match[1]),
  );
  assert.deepEqual(paths[0], paths[1], "push and PR filters match");
  assert.deepEqual(paths[0], [
    "python/**",
    `!python/${workflows.find(([, other]) => other !== pkg)[1]}/**`,
    ...sharedInputs,
  ]);
  return { source, pkg, paths: paths[0] };
});

function selectedPackages(files) {
  return triggers
    .filter(({ paths }) =>
      files.some((file) =>
        paths.reduce((selected, entry) => {
          const exclude = entry.startsWith("!");
          const pattern = exclude ? entry.slice(1) : entry;
          const matches = pattern.endsWith("/**")
            ? file.startsWith(pattern.slice(0, -2))
            : file === pattern;
          return matches ? !exclude : selected;
        }, false),
      ),
    )
    .map(({ pkg }) => pkg);
}

test("a package-only change selects all versions of only that package", () => {
  for (const [, pkg] of workflows) {
    for (const name of [
      "src/module.py",
      "tests/test_module.py",
      "pyproject.toml",
      "uv.lock",
      "README.md",
      "nested/file with spaces.py",
      "nested/file\nname.py",
    ]) {
      assert.deepEqual(selectedPackages([`python/${pkg}/${name}`]), [pkg]);
    }
  }
});

test("mixed package changes and cross-package renames select both suites", () => {
  assert.deepEqual(
    selectedPackages(workflows.map(([, pkg]) => `python/${pkg}/src/module.py`)),
    workflows.map(([, pkg]) => pkg),
  );
});

test("shared, unknown Python, and workflow changes conservatively select both suites", () => {
  for (const path of [
    ...sharedInputs,
    "python/AGENTS.md",
    "python/pyproject.toml",
    "python/uv.lock",
    "python/new-package/src/module.py",
    "python/assistant-stream-extra/test.py",
  ]) {
    assert.deepEqual(
      selectedPackages([path]),
      workflows.map(([, pkg]) => pkg),
      path,
    );
  }
});

test("unrelated changes select neither Python suite", () => {
  assert.deepEqual(
    selectedPackages(["README.md", "packages/core/src/index.ts"]),
    [],
  );
  assert.deepEqual(selectedPackages([]), []);
});

test("both entry workflows share unchanged test commands and Python versions", () => {
  const shared = readWorkflow("python-tests.yaml");
  assert.match(shared, /workflow_call:/);
  assert.match(shared, /python-version: \["3\.10", "3\.12", "3\.14"\]/);
  assert.match(shared, /fail-fast: false/);
  assert.match(shared, /working-directory: python\/\$\{\{ inputs.package \}\}/);
  assert.match(shared, /run: uv sync --all-extras/);
  assert.match(shared, /run: uv run pytest/);
  assert.match(shared, /enable-cache: true/);
  assert.match(shared, /node --test scripts\/python-test-workflows.test.mjs/);
  assert.doesNotMatch(shared, /concurrency:/);
  for (const { source, pkg } of triggers) {
    assert.match(source, /uses: \.\/\.github\/workflows\/python-tests.yaml/);
    assert.ok(source.includes(`package: ${pkg}`));
    assert.equal([...source.matchAll(/branches: \[main\]/g)].length, 2);
    assert.match(
      source,
      /group: \$\{\{ github.workflow \}\}-\$\{\{ github.ref \}\}/,
    );
    assert.match(source, /cancel-in-progress: true/);
  }
});
