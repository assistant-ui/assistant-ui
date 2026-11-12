import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const script = fileURLToPath(new URL("./setup-git-hooks.mjs", import.meta.url));

function fixture(t) {
  const base = mkdtempSync(path.join(tmpdir(), "aui-git-hooks-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const fixtureEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: path.join(base, "global.gitconfig"),
    GIT_CONFIG_NOSYSTEM: "1",
    HUSKY: "",
  };
  const git = (cwd, ...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      env: fixtureEnv,
    }).trim();
  const init = (name) => {
    const root = path.join(base, name);
    git(base, "init", "--quiet", root);
    writeFileSync(path.join(root, "package.json"), "{}\n");
    return root;
  };
  const run = (root, env = {}) =>
    spawnSync(process.execPath, [script, root], {
      cwd: base,
      encoding: "utf8",
      env: { ...fixtureEnv, ...env },
    });
  return { base, git, init, run };
}

test("a normal clone sets core.hooksPath to .husky", (t) => {
  const { git, init, run } = fixture(t);
  const root = init("clone");

  assert.equal(run(root).status, 0);
  assert.equal(
    git(root, "config", "--local", "--get", "core.hooksPath"),
    ".husky",
  );
});

test("a linked worktree sets core.hooksPath to .husky", (t) => {
  const { base, git, init, run } = fixture(t);
  const root = init("clone");
  const linked = path.join(base, "linked");
  git(root, "worktree", "add", "--quiet", "--orphan", "-b", "fixture", linked);
  writeFileSync(path.join(linked, "package.json"), "{}\n");

  assert.equal(statSync(path.join(linked, ".git")).isFile(), true);
  assert.equal(run(linked).status, 0);
  assert.equal(
    git(linked, "config", "--local", "--get", "core.hooksPath"),
    ".husky",
  );
});

test("a copy without .git inside another repository leaves outer hooks untouched", (t) => {
  const { git, init, run } = fixture(t);
  const outer = init("outer");
  git(outer, "config", "--local", "core.hooksPath", ".outer-hooks");
  const copy = path.join(outer, "copy");
  mkdirSync(copy);
  writeFileSync(path.join(copy, "package.json"), "{}\n");

  assert.equal(run(copy).status, 0);
  assert.equal(
    git(outer, "config", "--local", "--get", "core.hooksPath"),
    ".outer-hooks",
  );
});

test("HUSKY=0 leaves hooks untouched", (t) => {
  const { git, init, run } = fixture(t);
  const root = init("clone");
  git(root, "config", "--local", "core.hooksPath", ".existing-hooks");

  assert.equal(run(root, { HUSKY: "0" }).status, 0);
  assert.equal(
    git(root, "config", "--local", "--get", "core.hooksPath"),
    ".existing-hooks",
  );
});

test("a failed git config exits non-zero and reports the error", (t) => {
  const { init, run } = fixture(t);
  const root = init("clone");
  writeFileSync(path.join(root, ".git", "config.lock"), "");

  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /could not lock config file/i);
});
