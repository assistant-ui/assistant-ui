import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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

const bodyFor = (pin, commit) =>
  pin.file.endsWith(".json")
    ? `{\n  "source": "assistant-ui/skills@${commit}",\n  "skills": []\n}\n`
    : pin.file.includes("cli")
      ? `export const SKILLS_COMMIT = "${commit}";\n`
      : `const COMMIT = "${commit}";\n`;

function createRepo(commits) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-skills-commit-"));
  SKILLS_COMMIT_PINS.forEach((pin, index) => {
    const commit = commits[index];
    if (commit === null) return;
    const file = path.join(root, pin.file);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(
      file,
      commit === undefined ? "const NOTHING = 1;\n" : bodyFor(pin, commit),
    );
  });
  return root;
}

const withRepo = (commits, assertions) => {
  const root = createRepo(commits);
  try {
    assertions(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test("accepts pins that agree", () => {
  withRepo([a, a, a], (root) => {
    const { missing, mismatched } = findSkillsCommitProblems(
      readPinnedCommits(root),
    );
    assert.deepEqual(missing, []);
    assert.deepEqual(mismatched, []);
    assert.equal(runCheck(root), true);
  });
});

test("rejects a constant bumped on its own", () => {
  withRepo([a, b, a], (root) => {
    const { mismatched } = findSkillsCommitProblems(readPinnedCommits(root));
    assert.equal(mismatched.length, 1);
    assert.equal(runCheck(root), false);
  });
});

// Both constants bumped, snapshot never regenerated: the case that ships the
// old skills while every literal agrees.
test("rejects a snapshot left behind by a bump", () => {
  withRepo([b, b, a], (root) => {
    const { mismatched } = findSkillsCommitProblems(readPinnedCommits(root));
    assert.equal(mismatched.length, 1);
    assert.ok(mismatched[0].file.endsWith("agent-skills.generated.json"));
    assert.equal(runCheck(root), false);
  });
});

test("does not read a commit out of a commented-out example", () => {
  const root = createRepo([a, a, a]);
  try {
    const pin = SKILLS_COMMIT_PINS[0];
    writeFileSync(
      path.join(root, pin.file),
      `// export const SKILLS_COMMIT = "${b}";\nexport const SKILLS_COMMIT = "${a}";\n`,
    );
    assert.equal(readPinnedCommits(root)[0].commit, a);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports a pin whose file is missing rather than crashing", () => {
  withRepo([a, a, null], (root) => {
    const pins = readPinnedCommits(root);
    const { missing } = findSkillsCommitProblems(pins);
    assert.equal(missing.length, 1);
    assert.ok(missing[0].unreadable);
    assert.equal(runCheck(root), false);
  });
});

test("reports a pin whose declaration it cannot match", () => {
  withRepo([a, undefined, a], (root) => {
    const { missing } = findSkillsCommitProblems(readPinnedCommits(root));
    assert.equal(missing.length, 1);
    assert.equal(missing[0].unreadable, undefined);
    assert.equal(runCheck(root), false);
  });
});

// CI runs the file, not runCheck, so the entry has to exit non-zero itself.
test("the CLI entry exits non-zero on drift", () => {
  const script = path.join(repoRoot, "scripts", "check-skills-commit.mjs");
  const pass = spawnSync(process.execPath, [script], { cwd: repoRoot });
  assert.equal(pass.status, 0);

  withRepo([a, b, a], (root) => {
    const drifted = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
        const { runCheck } = await import(${JSON.stringify(script)});
        process.exit(runCheck(${JSON.stringify(root)}) ? 0 : 1);
      `,
      ],
      { cwd: repoRoot },
    );
    assert.equal(drifted.status, 1);
  });
});

test("the checked-in pins agree", () => {
  assert.equal(runCheck(repoRoot), true);
});
