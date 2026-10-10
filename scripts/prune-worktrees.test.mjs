import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parseWorktrees } from "./prune-worktrees.mjs";

const script = path.join(import.meta.dirname, "prune-worktrees.mjs");

function fixture(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "aui-prune-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = path.join(root, "bin");
  const prsFile = path.join(root, "prs.json");
  mkdirSync(bin);
  writeFileSync(
    path.join(bin, "gh"),
    `#!/usr/bin/env node
const fs = require("node:fs");
if (process.env.FAKE_GH_FAIL) process.exit(1);
const args = process.argv.slice(2);
const head = args[args.indexOf("--head") + 1];
const prs = JSON.parse(fs.readFileSync(${JSON.stringify(prsFile)}, "utf8"));
console.log(JSON.stringify(args.includes("--head") ? (prs[head] ?? []) : []));
`,
  );
  chmodSync(path.join(bin, "gh"), 0o755);
  writeFileSync(prsFile, "{}");

  const env = {
    ...process.env,
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.test",
    GIT_COMMITTER_NAME: "Fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.test",
  };
  const git = (cwd, ...args) =>
    execFileSync("git", args, {
      cwd,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

  const primary = path.join(root, "primary");
  git(root, "init", "-q", "--bare", "-b", "main", "origin.git");
  git(root, "clone", "-q", "origin.git", primary);
  writeFileSync(path.join(primary, "README.md"), "fixture\n");
  git(primary, "add", "README.md");
  git(primary, "commit", "-qm", "init");
  git(primary, "push", "-q", "origin", "main");

  const prs = {};
  let prNumber = 0;
  return {
    root,
    primary,
    git,
    worktree(name, at = root) {
      const dir = path.join(at, name);
      git(primary, "worktree", "add", "-q", "-b", name, dir, "origin/main");
      return dir;
    },
    commit(dir, file) {
      writeFileSync(path.join(dir, file), `${file}\n`);
      git(dir, "add", file);
      git(dir, "commit", "-qm", file);
      return git(dir, "rev-parse", "HEAD");
    },
    push(dir) {
      git(dir, "push", "-q", "origin", "HEAD");
    },
    squashMerge(branch) {
      git(primary, "merge", "-q", "--squash", branch);
      git(primary, "commit", "-qm", `squash ${branch}`);
      git(primary, "push", "-q", "origin", "main");
      git(primary, "push", "-q", "origin", "--delete", branch);
      git(primary, "fetch", "-q", "--prune");
    },
    pr(branch, state, headRefOid) {
      prs[branch] = [{ number: ++prNumber, state, headRefOid, mergedAt: null }];
      writeFileSync(prsFile, JSON.stringify(prs));
    },
    prune(...args) {
      const result = spawnSync("node", [script, ...args], {
        cwd: primary,
        env: { ...env, ...(args.includes("--no-gh") && { FAKE_GH_FAIL: "1" }) },
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout;
    },
    branches: () =>
      git(primary, "branch", "--format=%(refname:short)").split("\n"),
  };
}

test("parses porcelain output", () => {
  assert.deepEqual(
    parseWorktrees(
      "worktree /a\nHEAD 1\nbranch refs/heads/main\n\nworktree /b\nHEAD 2\ndetached\nlocked reason\n\nworktree /c\nHEAD 3\nbranch refs/heads/x/y\nprunable gitdir file points to non-existent location\n",
    ),
    [
      {
        path: "/a",
        head: "1",
        branch: "main",
        bare: false,
        locked: false,
        prunable: false,
      },
      {
        path: "/b",
        head: "2",
        branch: undefined,
        bare: false,
        locked: true,
        prunable: false,
      },
      {
        path: "/c",
        head: "3",
        branch: "x/y",
        bare: false,
        locked: false,
        prunable: true,
      },
    ],
  );
});

test("removes clean worktrees whose PR merged or closed and keeps the rest", (t) => {
  const f = fixture(t);

  const merged = f.worktree("merged");
  const mergedHead = f.commit(merged, "merged.txt");
  f.push(merged);
  f.squashMerge("merged");
  f.pr("merged", "MERGED", mergedHead);

  const closed = f.worktree("closed");
  f.pr("closed", "CLOSED", f.commit(closed, "closed.txt"));
  f.push(closed);

  const dirty = f.worktree("dirty");
  f.pr("dirty", "MERGED", f.commit(dirty, "dirty.txt"));
  f.push(dirty);
  writeFileSync(path.join(dirty, "untracked.txt"), "x\n");

  const unpushed = f.worktree("unpushed");
  f.pr("unpushed", "MERGED", f.commit(unpushed, "unpushed.txt"));
  f.push(unpushed);
  f.commit(unpushed, "later.txt");

  const open = f.worktree("open");
  f.pr("open", "OPEN", f.commit(open, "open.txt"));
  f.push(open);

  const noPr = f.worktree("no-pr");
  f.commit(noPr, "no-pr.txt");
  f.push(noPr);

  const locked = f.worktree("locked");
  f.pr("locked", "CLOSED", f.commit(locked, "locked.txt"));
  f.push(locked);
  f.git(f.primary, "worktree", "lock", locked);
  const nested = f.worktree("nested", locked);
  f.pr("nested", "CLOSED", f.commit(nested, "nested.txt"));
  f.push(nested);

  const dryRun = f.prune();
  assert.match(dryRun, /Checking each worktree's pull request on GitHub/);
  assert.match(dryRun, /Would remove 2:/);
  assert.match(dryRun, /\.\.\/merged \[merged\]: PR #\d+ merged/);
  assert.match(dryRun, /\.\.\/closed \[closed\]: PR #\d+ closed/);
  assert.match(dryRun, /\.\.\/dirty \[dirty\]: dirty/);
  assert.match(dryRun, /\.\.\/unpushed \[unpushed\]: unpushed/);
  assert.match(dryRun, /\.\.\/open \[open\]: open PR #\d+/);
  assert.match(dryRun, /\.\.\/no-pr \[no-pr\]: no PR/);
  assert.match(dryRun, /\.\.\/locked \[locked\]: locked/);
  assert.match(dryRun, /\.\.\/locked\/nested \[nested\]: locked/);
  assert.match(dryRun, /Dry run: pass --yes to remove 2\./);
  assert.ok(existsSync(merged) && existsSync(closed));

  f.prune("--yes");
  assert.ok(!existsSync(merged) && !existsSync(closed));
  for (const dir of [dirty, unpushed, open, noPr, locked, nested]) {
    assert.ok(existsSync(dir), dir);
  }
  const branches = f.branches();
  assert.ok(!branches.includes("merged") && !branches.includes("closed"));
  assert.ok(branches.includes("dirty") && branches.includes("unpushed"));
});

test("falls back to a squash-merge check against origin/main without gh", (t) => {
  const f = fixture(t);

  const merged = f.worktree("merged");
  f.commit(merged, "a.txt");
  f.commit(merged, "b.txt");
  f.push(merged);
  f.squashMerge("merged");

  const fresh = f.worktree("fresh");

  const pending = f.worktree("pending");
  f.commit(pending, "pending.txt");
  f.push(pending);

  const output = f.prune("--no-gh", "--yes");
  assert.match(
    output,
    /gh is unavailable: checking whether each branch is squash-merged/,
  );
  assert.match(output, /\.\.\/merged \[merged\]: merged into origin\/main/);
  assert.match(output, /\.\.\/fresh \[fresh\]: no commits beyond origin\/main/);
  assert.match(
    output,
    /\.\.\/pending \[pending\]: not merged into origin\/main/,
  );
  assert.ok(!existsSync(merged));
  assert.ok(existsSync(fresh) && existsSync(pending));
  assert.ok(!f.branches().includes("merged"));

  assert.match(f.prune("--local"), /^--local: checking/);
});
