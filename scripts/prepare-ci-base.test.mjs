import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { prepareCiBase } from "./prepare-ci-base.mjs";

function fixture(
  t,
  { advances = 0, baseRef = "main", baseAdvancesIntoFeature = false } = {},
) {
  const root = mkdtempSync(join(tmpdir(), "aui-ci-base-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const origin = join(root, "origin");
  const shallow = join(root, "shallow");
  const full = join(root, "full");
  mkdirSync(origin);
  mkdirSync(shallow);
  const git = (cwd, ...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const commit = (file, contents) => {
    writeFileSync(join(origin, file), contents);
    git(origin, "add", file);
    git(origin, "commit", "--quiet", "-m", file);
    return git(origin, "rev-parse", "HEAD");
  };
  git(origin, "init", "--quiet", "-b", baseRef);
  git(origin, "config", "user.name", "CI test");
  git(origin, "config", "user.email", "ci-test@example.invalid");
  commit("unchanged.txt", "original");
  commit("removed.txt", "old");
  git(origin, "switch", "--quiet", "-c", "feature");
  commit("first.txt", "first commit");
  git(origin, "mv", "removed.txt", "renamed.txt");
  git(origin, "commit", "--quiet", "-m", "rename");
  let feature = commit("second.txt", "second commit");
  git(origin, "switch", "--quiet", baseRef);
  const base = commit("base.txt", "base");
  let nextBase;
  if (baseAdvancesIntoFeature) {
    git(origin, "switch", "--quiet", "-c", "feature-next");
    nextBase = commit("shared.txt", "later base");
    commit("third.txt", "third commit");
    feature = commit("fourth.txt", "fourth commit");
    git(origin, "switch", "--quiet", baseRef);
  }
  git(origin, "switch", "--quiet", "-c", "pull-merge");
  git(origin, "merge", "--quiet", "--no-ff", feature, "-m", "merge");
  const head = git(origin, "rev-parse", "HEAD");
  git(origin, "switch", "--quiet", baseRef);
  if (nextBase) git(origin, "merge", "--quiet", "--ff-only", nextBase);
  for (let i = 0; i < advances; i++) commit(`advance-${i}.txt`, `${i}`);
  const url = pathToFileURL(origin).href;
  git(shallow, "init", "--quiet");
  git(shallow, "remote", "add", "origin", url);
  git(shallow, "fetch", "--quiet", "--depth=2", "origin", head);
  git(shallow, "checkout", "--quiet", "--detach", "FETCH_HEAD");
  git(root, "clone", "--quiet", "--no-local", url, full);
  git(full, "checkout", "--quiet", "--detach", head);
  return { root, origin, shallow, full, git, base, feature, baseRef };
}

for (const advances of [0, 1, 4]) {
  test(`preserves full-checkout comparisons when the base advances ${advances} times`, (t) => {
    const { shallow, full, git, base, feature, baseRef } = fixture(t, {
      advances,
    });
    prepareCiBase(baseRef, shallow);
    for (const args of [
      ["rev-parse", "HEAD^{tree}"],
      ["rev-parse", "HEAD^1"],
      ["rev-parse", "HEAD^2"],
      ["rev-parse", `origin/${baseRef}`],
      ["merge-base", "HEAD", `origin/${baseRef}`],
      ["diff", "--name-status", "--no-renames", `origin/${baseRef}`, "HEAD"],
      ["diff", "--name-status", `origin/${baseRef}...HEAD`],
      ["show", "HEAD^1:base.txt"],
    ])
      assert.equal(git(shallow, ...args), git(full, ...args), args.join(" "));
    assert.equal(git(shallow, "rev-parse", "HEAD^1"), base);
    assert.equal(git(shallow, "rev-parse", "HEAD^2"), feature);
    assert.equal(
      git(shallow, "rev-parse", "--is-shallow-repository"),
      advances === 0 ? "true" : "false",
    );
  });
}

test("does not accept an older shallow merge base when the base moves into the feature history", (t) => {
  const { shallow, full, git, baseRef } = fixture(t, {
    baseAdvancesIntoFeature: true,
  });
  prepareCiBase(baseRef, shallow);
  assert.equal(
    git(shallow, "merge-base", "HEAD", `origin/${baseRef}`),
    git(full, "merge-base", "HEAD", `origin/${baseRef}`),
  );
});

test("supports non-main bases with slashes", (t) => {
  const { shallow, full, git, baseRef } = fixture(t, {
    baseRef: "release/next",
  });
  prepareCiBase(baseRef, shallow);
  assert.equal(
    git(shallow, "merge-base", "HEAD", `origin/${baseRef}`),
    git(full, "merge-base", "HEAD", `origin/${baseRef}`),
  );
});

test("a full checkout remains unchanged", (t) => {
  const { full, git } = fixture(t);
  const refs = git(full, "show-ref");
  prepareCiBase("main", full);
  assert.equal(git(full, "show-ref"), refs);
});

test("an unavailable base fails rather than skipping checks", (t) => {
  const { shallow } = fixture(t);
  assert.throws(() => prepareCiBase("missing", shallow));
});

test("invalid ref names fail before fetching", (t) => {
  const { shallow } = fixture(t);
  assert.throws(() => prepareCiBase("bad..ref", shallow));
});

test("only PR jobs use shallow history and prepare their comparison base", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/code-quality.yaml", import.meta.url),
    "utf8",
  );
  for (const job of [
    "build",
    "build-apps",
    "api-reference-drift",
    "test",
    "typecheck",
  ]) {
    const section = workflow
      .split(`\n  ${job}:\n`)[1]
      .split(/\n  [a-z-]+:\n/)[0];
    assert.match(
      section,
      /fetch-depth: \$\{\{ github.event_name == 'pull_request' && 2 \|\| 0 \}\}/,
    );
    assert.match(
      section,
      /if: github.event_name == 'pull_request'\n\s+run: node scripts\/prepare-ci-base.mjs/,
    );
  }
});
