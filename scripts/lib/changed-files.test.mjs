import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { changedFilesSince } from "./changed-files.mjs";

const runGit = (cwd, args) => {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};

const makeRepo = () => {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "changed-files-test-"));
  runGit(repoRoot, ["init", "--quiet"]);
  runGit(repoRoot, ["config", "user.email", "test@example.com"]);
  runGit(repoRoot, ["config", "user.name", "Test"]);
  for (const file of ["plain.txt", "line\nbreak.txt"]) {
    writeFileSync(path.join(repoRoot, file), "before");
  }
  runGit(repoRoot, ["add", "--all"]);
  runGit(repoRoot, ["commit", "--quiet", "-m", "base"]);
  return repoRoot;
};

test("changedFilesSince parses NUL-delimited paths", () => {
  const repoRoot = makeRepo();
  try {
    const base = runGit(repoRoot, ["rev-parse", "HEAD"]);
    for (const file of ["plain.txt", "line\nbreak.txt"]) {
      writeFileSync(path.join(repoRoot, file), "after");
    }
    assert.deepEqual(changedFilesSince(base, repoRoot).sort(), [
      "line\nbreak.txt",
      "plain.txt",
    ]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("changedFilesSince returns an empty list for an unchanged tree", () => {
  const repoRoot = makeRepo();
  try {
    const base = runGit(repoRoot, ["rev-parse", "HEAD"]);
    assert.deepEqual(changedFilesSince(base, repoRoot), []);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("changedFilesSince reports git failures", () => {
  const repoRoot = makeRepo();
  try {
    assert.throws(
      () => changedFilesSince("missing-revision", repoRoot),
      /Unable to determine changed files since missing-revision/,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
