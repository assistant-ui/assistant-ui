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
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import { prepareCiBase, resolveCiBase } from "./prepare-ci-base.mjs";

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

test("pull requests compare against the first parent", () => {
  assert.equal(
    resolveCiBase({
      eventName: "pull_request",
      before: "ignored",
      mergeGroupBase: "ignored",
    }),
    "HEAD^1",
  );
});

test("merge groups use their supplied base", () => {
  assert.equal(
    resolveCiBase({
      eventName: "merge_group",
      before: "ignored",
      mergeGroupBase: "merge-base",
    }),
    "merge-base",
  );
});

test("a push with a resolvable before SHA uses that SHA", (t) => {
  const { full, git } = fixture(t);
  const before = git(full, "rev-parse", "HEAD^1");
  assert.equal(resolveCiBase({ eventName: "push", before }, full), before);
});

for (const before of ["0".repeat(40), "f".repeat(40), ""]) {
  test(`a push with an unavailable before SHA (${before || "empty"}) uses the first parent`, (t) => {
    const { full } = fixture(t);
    assert.equal(resolveCiBase({ eventName: "push", before }, full), "HEAD^1");
  });
}

test("other events use before without checking the ref", () => {
  assert.equal(
    resolveCiBase({ eventName: "workflow_dispatch", before: "unavailable" }),
    "unavailable",
  );
});

test("missing event values preserve the empty fallback", () => {
  assert.equal(resolveCiBase({ eventName: "merge_group" }), "");
  assert.equal(resolveCiBase({ eventName: "workflow_dispatch" }), "");
});

test("the resolve CLI prints the selected base from environment values", (t) => {
  const { full, base } = fixture(t);
  const output = execFileSync(
    process.execPath,
    [
      fileURLToPath(new URL("./prepare-ci-base.mjs", import.meta.url)),
      "--resolve",
    ],
    {
      cwd: full,
      env: {
        ...process.env,
        CI_EVENT_NAME: "merge_group",
        CI_BEFORE: "ignored",
        CI_MERGE_GROUP_BASE: base,
      },
      encoding: "utf8",
    },
  );
  assert.equal(output, `${base}\n`);
});

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

for (const { baseRef, article, label } of [
  { baseRef: undefined, article: "a", label: "missing" },
  { baseRef: "", article: "an", label: "empty" },
]) {
  test(`${article} ${label} base fails before running git`, () => {
    assert.throws(
      () => prepareCiBase(baseRef, "/not-a-repository"),
      /Missing comparison base ref \(GITHUB_BASE_REF\)/,
    );
  });
}

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

test("the four workflow steps resolve their bases from event environment values", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/code-quality.yaml", import.meta.url),
    "utf8",
  );
  for (const name of [
    "Detect package build inputs",
    "Detect app build inputs",
    "Detect API reference inputs",
    "Resolve CI comparison base",
  ]) {
    const step = workflow
      .split(`      - name: ${name}\n`)[1]
      .split("\n      - name: ")[0];
    assert.ok(step, name);
    for (const mapping of [
      "CI_EVENT_NAME: ${{ github.event_name }}",
      "CI_BEFORE: ${{ github.event.before }}",
      "CI_MERGE_GROUP_BASE: ${{ github.event.merge_group.base_sha }}",
    ]) {
      assert.ok(step.includes(mapping), `${name}: ${mapping}`);
    }
    assert.match(
      step,
      /BASE=\$\(node scripts\/prepare-ci-base\.mjs --resolve\)/,
    );
    assert.doesNotMatch(step.split("        run: |\n")[1], /\$\{\{/);
  }
});
