import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
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

const workflow = readFileSync(
  new URL("../.github/workflows/python-tests.yaml", import.meta.url),
  "utf8",
);
const selection = workflow
  .match(
    /      - name: Select Python suites[\s\S]*?        run: \|\n((?:          .*\n)+)/,
  )[1]
  .replace(/^          /gm, "");
const pythonFiles = execFileSync("git", ["ls-files", "-z", "--", "python"], {
  cwd: new URL("..", import.meta.url),
  encoding: "utf8",
}).split("\0");
const testedPackages = pythonFiles
  .filter((file) => /^python\/[^/]+\/pyproject\.toml$/.test(file))
  .map((file) => file.split("/")[1])
  .filter((pkg) =>
    pythonFiles.some(
      (file) =>
        file.startsWith(`python/${pkg}/`) &&
        /^(?:test_.*|.*_test)\.py$/.test(path.basename(file)),
    ),
  );

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-python-selection-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "Fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.com",
    GIT_COMMITTER_NAME: "Fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.com",
  };
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, env, encoding: "utf8" }).trim();
  const write = (file, text = "fixture\n") => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  const commit = () => {
    git("add", ".");
    git("commit", "-qm", "fixture");
    return git("rev-parse", "HEAD");
  };
  git("init", "-q");
  for (const pkg of testedPackages) write(`python/${pkg}/module.py`);
  const base = commit();
  const selected = (ref = base) => {
    const output = path.join(root, ".git", "selection-output");
    writeFileSync(output, "");
    const result = spawnSync("bash", ["-c", selection], {
      cwd: root,
      encoding: "utf8",
      env: { ...env, BASE_REF: ref, GITHUB_OUTPUT: output },
    });
    assert.equal(result.status, 0, result.stderr);
    const [, value] = /^packages=(.+)\n$/.exec(readFileSync(output, "utf8"));
    return JSON.parse(value);
  };
  return { root, write, commit, selected };
}

for (const pkg of testedPackages) {
  test(`selects only ${pkg} for its changes, including whitespace in filenames`, (t) => {
    const f = fixture(t);
    f.write(`python/${pkg}/nested/file with\nspaces.py`);
    f.commit();
    assert.deepEqual(f.selected(), [pkg]);
  });
}

for (const file of [
  "python/pyproject.toml",
  "python/unknown-package/test.py",
  ".github/workflows/python-tests.yaml",
  "scripts/python-test-selection.test.mjs",
]) {
  test(`shared input ${file} selects all suites`, (t) => {
    const f = fixture(t);
    f.write(file);
    f.commit();
    assert.deepEqual(f.selected().toSorted(), testedPackages.toSorted());
  });
}

for (const [from, to] of [
  ["assistant-stream", "assistant-ui-sync-server-api"],
  ["assistant-transport-backend", "assistant-transport-backend-langgraph"],
]) {
  test(`a rename from ${from} to ${to} selects both affected suites`, (t) => {
    const f = fixture(t);
    rmSync(path.join(f.root, `python/${from}/module.py`));
    f.write(`python/${to}/moved.py`);
    f.commit();
    assert.deepEqual(f.selected().toSorted(), [from, to].toSorted());
  });
}

test("deleted files still select their package", (t) => {
  const f = fixture(t);
  rmSync(path.join(f.root, "python/assistant-stream/module.py"));
  f.commit();
  assert.deepEqual(f.selected(), ["assistant-stream"]);
});

test("unavailable baselines select every Python project with checked-in tests", (t) => {
  const f = fixture(t);
  for (const base of ["", "missing-ref", "0".repeat(40)]) {
    assert.deepEqual(f.selected(base).toSorted(), testedPackages.toSorted());
  }
});

test("unrelated files and an empty diff skip all suites", (t) => {
  const f = fixture(t);
  assert.deepEqual(f.selected(), []);
  f.write("README.md");
  f.commit();
  assert.deepEqual(f.selected(), []);
});

test("a large mixed diff still selects only the affected packages", (t) => {
  const f = fixture(t);
  for (let i = 0; i < 3500; i++)
    f.write(`python/assistant-stream/generated/${i}.py`);
  f.write("python/assistant-ui-sync-server-api/last.py");
  f.commit();
  assert.deepEqual(f.selected().toSorted(), [
    "assistant-stream",
    "assistant-ui-sync-server-api",
  ]);
});

const transportPage =
  "apps/docs/content/docs/runtimes/custom/assistant-transport.mdx";
const checker = "apps/docs/lib/python-blocks.py";
const backend = "assistant-transport-backend";
const backendReadme = `python/${backend}/README_examples.md`;
const sampleTest = "python/assistant-stream/tests/test_docs_samples.py";
const unrelatedDocs = ["apps/docs/content/meta.json", "apps/docs/lib/notes.md"];

for (const event of ["push", "pull_request"]) {
  test(`${event} watches routing controls and docs sample inputs`, () => {
    const block = workflow.match(
      new RegExp(`^  ${event}:\\n[\\s\\S]*?(?=^  \\w+:|^\\S)`, "m"),
    )[0];
    const patterns = [...block.matchAll(/^      - "(.+)"$/gm)].map(
      (match) => match[1],
    );
    const matches = (file) =>
      patterns.some((pattern) => path.posix.matchesGlob(file, pattern));
    for (const file of [
      transportPage,
      "apps/docs/content/index.md",
      checker,
      backendReadme,
      sampleTest,
      ".github/workflows/python-tests.yaml",
      "scripts/python-test-selection.test.mjs",
    ]) {
      assert.ok(matches(file), file);
    }
    for (const file of unrelatedDocs) assert.equal(matches(file), false, file);
  });
}

for (const [files, expected] of [
  [[transportPage], ["assistant-stream"]],
  [["apps/docs/content/index.md"], ["assistant-stream"]],
  [[checker], ["assistant-stream"]],
  [[sampleTest], ["assistant-stream"]],
  [[backendReadme], ["assistant-stream", backend]],
  [[`python/${backend}/nested/README.md`], [backend]],
  [[`python/${backend}/README.mdx`], [backend]],
  [
    [transportPage, `python/${backend}/module.py`],
    ["assistant-stream", backend],
  ],
  [unrelatedDocs, []],
]) {
  test(`selects docs sample suites for ${files.join(" and ")}`, (t) => {
    const f = fixture(t);
    for (const file of files) f.write(file, "changed\n");
    f.commit();
    assert.deepEqual(f.selected().toSorted(), expected.toSorted());
  });
}

test("moving or deleting a docs sample still selects assistant-stream", (t) => {
  const f = fixture(t);
  f.write(transportPage);
  f.write(backendReadme);
  const base = f.commit();
  rmSync(path.join(f.root, transportPage));
  f.write("apps/docs/archive/transport.mdx");
  const moved = f.commit();
  assert.deepEqual(f.selected(base), ["assistant-stream"]);
  rmSync(path.join(f.root, backendReadme));
  f.commit();
  assert.deepEqual(f.selected(moved).toSorted(), ["assistant-stream", backend]);
});

test("pytest allocates only the planner's packages across the three Python versions", () => {
  const [plan, pytest] = workflow.split("\n  test:\n");
  assert.ok(plan.includes("packages: ${{ steps.selection.outputs.packages }}"));
  assert.match(pytest, /^    needs: plan$/m);
  assert.match(pytest, /^    if: needs\.plan\.outputs\.packages != '\[\]'$/m);
  assert.ok(
    pytest.includes("package: ${{ fromJSON(needs.plan.outputs.packages) }}"),
  );
  assert.match(pytest, /python-version: \["3\.10", "3\.12", "3\.14"\]/);
  assert.doesNotMatch(
    pytest,
    /^        if:/m,
    "every allocated job must run pytest",
  );
});
