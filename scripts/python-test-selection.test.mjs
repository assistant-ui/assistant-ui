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
    /      - name: Select Python suite[\s\S]*?        run: \|\n([\s\S]*?)(?=\n      - name:)/,
  )[1]
  .replace(/^          /gm, "");
const packages = workflow
  .match(/        package:\n((?:          - .+\n)+)/)[1]
  .trim()
  .split("\n")
  .map((line) => line.trim().slice(2));
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

test("every Python project with checked-in tests has a matrix job", () => {
  assert.deepEqual(packages.toSorted(), testedPackages.toSorted());
});

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
  const selected = (pkg, ref = base) => {
    const output = path.join(root, "selection-output");
    writeFileSync(output, "");
    const result = spawnSync("bash", ["-c", selection], {
      cwd: root,
      encoding: "utf8",
      env: { ...env, PACKAGE: pkg, BASE_REF: ref, GITHUB_OUTPUT: output },
    });
    assert.equal(result.status, 0, result.stderr);
    return readFileSync(output, "utf8").trim() === "run=true";
  };
  return { root, write, commit, selected };
}

for (const pkg of testedPackages) {
  test(`selects only ${pkg} for its changes, including whitespace in filenames`, (t) => {
    const f = fixture(t);
    f.write(`python/${pkg}/nested/file with\nspaces.py`);
    f.commit();
    for (const candidate of packages)
      assert.equal(f.selected(candidate), candidate === pkg);
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
    for (const pkg of packages) assert.equal(f.selected(pkg), true);
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
    for (const pkg of packages)
      assert.equal(f.selected(pkg), pkg === from || pkg === to);
  });
}

test("deleted files still select their package", (t) => {
  const f = fixture(t);
  rmSync(path.join(f.root, "python/assistant-stream/module.py"));
  f.commit();
  for (const pkg of packages)
    assert.equal(f.selected(pkg), pkg === "assistant-stream");
});

test("missing or zero baselines conservatively run all suites", (t) => {
  const f = fixture(t);
  for (const base of ["missing-ref", "0".repeat(40)]) {
    for (const pkg of packages) assert.equal(f.selected(pkg, base), true);
  }
});

test("unrelated files and an empty diff skip all suites", (t) => {
  const f = fixture(t);
  for (const pkg of packages) assert.equal(f.selected(pkg), false);
  f.write("README.md");
  f.commit();
  for (const pkg of packages) assert.equal(f.selected(pkg), false);
});

test("a large mixed diff still selects only the affected packages", (t) => {
  const f = fixture(t);
  for (let i = 0; i < 3500; i++)
    f.write(`python/assistant-stream/generated/${i}.py`);
  f.write("python/assistant-ui-sync-server-api/last.py");
  f.commit();
  for (const pkg of packages)
    assert.equal(
      f.selected(pkg),
      pkg === "assistant-stream" || pkg === "assistant-ui-sync-server-api",
    );
});
