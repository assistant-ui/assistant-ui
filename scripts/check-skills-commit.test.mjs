import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  findSkillsCommitProblems,
  readPinnedCommits,
  runCheck,
  SKILLS_COMMIT_PINS,
} from "./check-skills-commit.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const a = "a".repeat(40);
const b = "b".repeat(40);

function createRepo(commits) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-skills-commit-"));
  SKILLS_COMMIT_PINS.forEach((pin, index) => {
    const file = path.join(root, pin.file);
    mkdirSync(path.dirname(file), { recursive: true });
    const commit = commits[index];
    writeFileSync(
      file,
      commit === undefined
        ? `const ${pin.constant} = undefined;\n`
        : `const ${pin.constant} = "${commit}";\n`,
    );
  });
  return root;
}

test("accepts pins that agree", () => {
  const root = createRepo([a, a]);
  try {
    const { missing, mismatched } = findSkillsCommitProblems(
      readPinnedCommits(root),
    );
    assert.deepEqual(missing, []);
    assert.deepEqual(mismatched, []);
    assert.equal(runCheck(root), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects pins that drift apart", () => {
  const root = createRepo([a, b]);
  try {
    const { mismatched } = findSkillsCommitProblems(readPinnedCommits(root));
    assert.equal(mismatched.length, 1);
    assert.equal(mismatched[0].commit, b);
    assert.equal(runCheck(root), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports a pin it cannot read rather than passing", () => {
  const root = createRepo([a, undefined]);
  try {
    const { missing } = findSkillsCommitProblems(readPinnedCommits(root));
    assert.equal(missing.length, 1);
    assert.equal(runCheck(root), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the checked-in pins agree", () => {
  assert.equal(runCheck(repoRoot), true);
});
