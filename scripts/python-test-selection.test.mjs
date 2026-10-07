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
const packages = ["assistant-stream", "assistant-ui-sync-server-api"];

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
  for (const pkg of packages) write(`python/${pkg}/module.py`);
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

for (const pkg of packages) {
  test(`selects only ${pkg} for its changes, including whitespace in filenames`, (t) => {
    const f = fixture(t);
    f.write(`python/${pkg}/nested/file with\nspaces.py`);
    f.commit();
    for (const candidate of packages)
      assert.equal(f.selected(candidate), candidate === pkg);
  });
}

test("shared Python and workflow inputs select both packages", (t) => {
  const f = fixture(t);
  f.write("python/pyproject.toml");
  f.write("python/unknown-package/test.py");
  f.write(".github/workflows/python-tests.yaml");
  f.commit();
  for (const pkg of packages) assert.equal(f.selected(pkg), true);
});

test("cross-package renames select both packages", (t) => {
  const f = fixture(t);
  rmSync(path.join(f.root, "python/assistant-stream/module.py"));
  f.write("python/assistant-ui-sync-server-api/moved.py");
  f.commit();
  for (const pkg of packages) assert.equal(f.selected(pkg), true);
});

test("deleted files still select their package", (t) => {
  const f = fixture(t);
  rmSync(path.join(f.root, "python/assistant-stream/module.py"));
  f.commit();
  assert.equal(f.selected("assistant-stream"), true);
  assert.equal(f.selected("assistant-ui-sync-server-api"), false);
});

test("missing or zero baselines conservatively run both suites", (t) => {
  const f = fixture(t);
  for (const base of ["missing-ref", "0".repeat(40)]) {
    for (const pkg of packages) assert.equal(f.selected(pkg, base), true);
  }
});

test("unrelated files and an empty diff skip both suites", (t) => {
  const f = fixture(t);
  for (const pkg of packages) assert.equal(f.selected(pkg), false);
  f.write("README.md");
  f.commit();
  for (const pkg of packages) assert.equal(f.selected(pkg), false);
});

test("a large mixed diff still selects both packages", (t) => {
  const f = fixture(t);
  for (let i = 0; i < 3500; i++)
    f.write(`python/assistant-stream/generated/${i}.py`);
  f.write("python/assistant-ui-sync-server-api/last.py");
  f.commit();
  for (const pkg of packages) assert.equal(f.selected(pkg), true);
});
