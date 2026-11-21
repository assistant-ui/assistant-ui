import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
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

const trackedHusky = fileURLToPath(new URL("../.husky/", import.meta.url));

const shellPath = (file) => file.replaceAll("\\", "/");

const lines = (file) => {
  try {
    return readFileSync(file, "utf8").split("\n").filter(Boolean);
  } catch {
    return [];
  }
};

/**
 * This repository's tracked `.husky` hooks in a throwaway repository, with a fake `pnpm` on
 * PATH (so `lint-staged` is never really run) and a global hook of its own that reports each call.
 */
function hookFixture(t) {
  const harness = fixture(t);
  const { base, git, init } = harness;
  const root = init("hook");
  const husky = path.join(root, ".husky");
  mkdirSync(husky);
  for (const name of ["global-hook", "pre-commit"]) {
    writeFileSync(
      path.join(husky, name),
      readFileSync(path.join(trackedHusky, name)),
    );
  }
  chmodSync(path.join(husky, "pre-commit"), 0o755);

  const recorded = path.join(base, "recorded");
  const packaged = path.join(base, "packaged");
  const bin = path.join(base, "bin");
  mkdirSync(bin);
  writeFileSync(
    path.join(bin, "pnpm"),
    `#!/bin/sh\nprintf '%s|CI=%s\\n' "$*" "\${CI-}" >> "${shellPath(packaged)}"\n`,
  );
  chmodSync(path.join(bin, "pnpm"), 0o755);

  const globalHooks = path.join(base, "global-hooks");
  mkdirSync(globalHooks);
  writeFileSync(
    path.join(globalHooks, "pre-commit"),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "${shellPath(recorded)}"\n`,
  );
  chmodSync(path.join(globalHooks, "pre-commit"), 0o755);

  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: path.join(base, "global.gitconfig"),
    GIT_CONFIG_NOSYSTEM: "1",
    HUSKY: "",
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
  };
  git(base, "config", "--global", "core.hooksPath", shellPath(globalHooks));
  const runHook = (args = [], overrides = {}) =>
    spawnSync("sh", [path.join(husky, "pre-commit"), ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...env, ...overrides },
    });
  return { base, root, husky, git, runHook, recorded, packaged };
}

test("a tracked hook runs the user's global hook, then lint-staged", (t) => {
  const { runHook, recorded, packaged } = hookFixture(t);

  const result = runHook(["--from-a-test"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(lines(recorded), ["--from-a-test"]);
  assert.deepEqual(lines(packaged), ["exec lint-staged|CI=true"]);
});

test("HUSKY=0 skips the global hook and lint-staged alike", (t) => {
  const { runHook, recorded, packaged } = hookFixture(t);

  const result = runHook([], { HUSKY: "0" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(lines(recorded), []);
  assert.deepEqual(lines(packaged), []);
});

test("a failing global hook stops the commit before lint-staged", (t) => {
  const { base, runHook, packaged } = hookFixture(t);
  const hook = path.join(base, "global-hooks", "pre-commit");
  writeFileSync(hook, "#!/bin/sh\nexit 7\n");
  chmodSync(hook, 0o755);

  const result = runHook();
  assert.equal(result.status, 7);
  assert.deepEqual(lines(packaged), []);
});

test("a global hook that is this repository's own .husky is not called", (t) => {
  const { root, husky, git, runHook, recorded, packaged } = hookFixture(t);
  git(root, "config", "--global", "core.hooksPath", shellPath(husky));

  const result = runHook();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(lines(recorded), []);
  assert.deepEqual(lines(packaged), ["exec lint-staged|CI=true"]);
});
