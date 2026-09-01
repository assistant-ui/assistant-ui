import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
import {
  buildDependencyGraph,
  bumpVersion,
  computeCascade,
  findRangeBreakingBumps,
  isOutsideCaretRange,
  renderSummary,
  runCheck,
} from "./check-changeset-semver.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

function createWorkspace(manifests, changesets) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-changeset-semver-"));
  for (const manifest of manifests) {
    const dir = manifest.name.replace(/^@[^/]+\//, "");
    mkdirSync(path.join(root, "packages", dir), { recursive: true });
    writeFileSync(
      path.join(root, "packages", dir, "package.json"),
      JSON.stringify(manifest),
    );
  }
  mkdirSync(path.join(root, ".changeset"), { recursive: true });
  for (const [file, frontmatter] of Object.entries(changesets)) {
    writeFileSync(
      path.join(root, ".changeset", file),
      `---\n${frontmatter}\n---\n\nfeat: fixture\n`,
    );
  }
  return root;
}

function graphOf(manifests) {
  return buildDependencyGraph(manifests);
}

test("a bump raises one field and zeroes the ones below it", () => {
  assert.equal(bumpVersion("1.2.3", "major"), "2.0.0");
  assert.equal(bumpVersion("1.2.3", "minor"), "1.3.0");
  assert.equal(bumpVersion("1.2.3", "patch"), "1.2.4");
});

test("a caret range tightens as the major approaches zero", () => {
  assert.equal(isOutsideCaretRange("1.2.3", "1.9.0"), false);
  assert.equal(isOutsideCaretRange("1.2.3", "2.0.0"), true);

  assert.equal(isOutsideCaretRange("0.12.15", "0.12.16"), false);
  assert.equal(isOutsideCaretRange("0.12.15", "0.13.0"), true);
  assert.equal(isOutsideCaretRange("0.12.15", "1.0.0"), true);

  assert.equal(isOutsideCaretRange("0.0.5", "0.0.5"), false);
  assert.equal(isOutsideCaretRange("0.0.5", "0.0.6"), true);
  assert.equal(isOutsideCaretRange("0.0.5", "0.1.0"), true);
});

test("a workspace:^ dependency enters the graph as the caret it publishes as", () => {
  const { revDeps } = graphOf([
    { name: "@fixture/dep", version: "0.3.16" },
    {
      name: "@fixture/consumer",
      version: "1.0.0",
      dependencies: { "@fixture/dep": "workspace:^" },
    },
  ]);

  assert.deepEqual(revDeps.get("@fixture/dep"), [
    { name: "@fixture/consumer", version: "1.0.0", range: "^0.3.16" },
  ]);
});

test("a peer dependency constrains consumers the same way a runtime one does", () => {
  const { revDeps } = graphOf([
    { name: "@fixture/dep", version: "1.0.0" },
    {
      name: "@fixture/consumer",
      version: "1.0.0",
      peerDependencies: { "@fixture/dep": "^1.0.0" },
    },
  ]);

  assert.deepEqual(
    revDeps.get("@fixture/dep").map(({ name }) => name),
    ["@fixture/consumer"],
  );
});

test("only edges a caret range can express reach the graph", () => {
  const { revDeps } = graphOf([
    { name: "@fixture/dep", version: "1.0.0" },
    {
      name: "@fixture/consumer",
      version: "1.0.0",
      dependencies: {
        "@fixture/dep": "1.0.0",
        "@fixture/unknown": "^1.0.0",
        react: "^19.0.0",
      },
      devDependencies: { "@fixture/dep": "^1.0.0" },
    },
  ]);

  assert.deepEqual([...revDeps.keys()], []);
});

test("a bump that leaves a dependent's range forces a patch on it", () => {
  const { pkgMap, revDeps } = graphOf([
    { name: "@fixture/dep", version: "0.12.15" },
    {
      name: "@fixture/consumer",
      version: "1.0.0",
      dependencies: { "@fixture/dep": "^0.12.15" },
    },
  ]);

  assert.deepEqual(
    computeCascade(
      [{ name: "@fixture/dep", version: "0.12.15", bumpType: "minor" }],
      pkgMap,
      revDeps,
    ),
    [
      {
        name: "@fixture/consumer",
        version: "1.0.0",
        newVersion: "1.0.1",
        isBreaking: false,
      },
    ],
  );
});

test("a bump that stays inside a dependent's range cascades to nothing", () => {
  const { pkgMap, revDeps } = graphOf([
    { name: "@fixture/dep", version: "1.2.0" },
    {
      name: "@fixture/consumer",
      version: "1.0.0",
      dependencies: { "@fixture/dep": "^1.2.0" },
    },
  ]);

  assert.deepEqual(
    computeCascade(
      [{ name: "@fixture/dep", version: "1.2.0", bumpType: "patch" }],
      pkgMap,
      revDeps,
    ),
    [],
  );
});

test("a cascade recurses through an intermediate whose own patch breaks its range", () => {
  const { pkgMap, revDeps } = graphOf([
    { name: "@fixture/base", version: "0.3.0" },
    {
      name: "@fixture/middle",
      version: "0.0.5",
      dependencies: { "@fixture/base": "^0.3.0" },
    },
    {
      name: "@fixture/top",
      version: "1.2.0",
      dependencies: { "@fixture/middle": "^0.0.5" },
    },
  ]);

  assert.deepEqual(
    computeCascade(
      [{ name: "@fixture/base", version: "0.3.0", bumpType: "minor" }],
      pkgMap,
      revDeps,
    ),
    [
      {
        name: "@fixture/middle",
        version: "0.0.5",
        newVersion: "0.0.6",
        isBreaking: true,
      },
      {
        name: "@fixture/top",
        version: "1.2.0",
        newVersion: "1.2.1",
        isBreaking: false,
      },
    ],
  );
});

test("a package already carrying its own bump is never cascaded onto", () => {
  const { pkgMap, revDeps } = graphOf([
    { name: "@fixture/dep", version: "0.3.0" },
    {
      name: "@fixture/consumer",
      version: "0.5.0",
      dependencies: { "@fixture/dep": "^0.3.0" },
    },
  ]);

  assert.deepEqual(
    computeCascade(
      [
        { name: "@fixture/dep", version: "0.3.0", bumpType: "minor" },
        { name: "@fixture/consumer", version: "0.5.0", bumpType: "minor" },
      ],
      pkgMap,
      revDeps,
    ),
    [],
  );
});

test("only a bump that leaves its own caret range is reported", () => {
  const bumps = [
    { name: "zero-zero-patch", version: "0.0.5", bumpType: "patch" },
    { name: "zero-patch", version: "0.12.15", bumpType: "patch" },
    { name: "zero-minor", version: "0.12.15", bumpType: "minor" },
    { name: "zero-major", version: "0.12.15", bumpType: "major" },
    { name: "stable-minor", version: "1.3.12", bumpType: "minor" },
    { name: "stable-major", version: "1.3.12", bumpType: "major" },
  ];

  assert.deepEqual(
    findRangeBreakingBumps(bumps).map(({ name, reason }) => ({ name, reason })),
    [
      {
        name: "zero-minor",
        reason: "0.x package — minor bump breaks `^` caret range",
      },
      {
        name: "zero-major",
        reason: "0.x package — major bump breaks `^` caret range",
      },
      {
        name: "stable-major",
        reason: "major bump breaks `^` caret range",
      },
    ],
  );
});

test("a safe changeset renders the impact table and the cascade it forces", () => {
  assert.equal(
    renderSummary({
      bumps: [
        {
          file: "shy-pots-shave.md",
          name: "@fixture/dep",
          version: "1.2.3",
          bumpType: "patch",
        },
      ],
      violations: [],
      cascade: [
        {
          name: "@fixture/consumer",
          version: "0.0.5",
          newVersion: "0.0.6",
          isBreaking: true,
        },
      ],
    }),
    `## Changeset Impact Summary

| File | Package | Version | Bump |
| --- | --- | --- | --- |
| \`shy-pots-shave.md\` | \`@fixture/dep\` | 1.2.3 | patch |

### Cascade Impact (1 packages)

| Package | Version | Cascade Bump | Breaking |
| --- | --- | --- | --- |
| \`@fixture/consumer\` | 0.0.5 → 0.0.6 | patch | ⛔ YES — \`^0.0.5\` breaks |

> **1 downstream package(s)** will also break their consumers' \`^\` ranges.

`,
  );
});

test("a breaking changeset renders the violation table and what it means", () => {
  assert.equal(
    renderSummary({
      bumps: [
        {
          file: "shy-pots-shave.md",
          name: "@fixture/dep",
          version: "0.12.15",
          bumpType: "minor",
        },
      ],
      violations: [
        {
          file: "shy-pots-shave.md",
          name: "@fixture/dep",
          version: "0.12.15",
          bumpType: "minor",
          reason: "0.x package — minor bump breaks `^` caret range",
        },
      ],
      cascade: [],
    }),
    `## ⚠️ Semver-Breaking Changeset Detected

| File | Package | Version | Bump | Why |
| --- | --- | --- | --- | --- |
| \`shy-pots-shave.md\` | \`@fixture/dep\` | 0.12.15 | **minor** | 0.x package — minor bump breaks \`^\` caret range |

### What this means

- **0.x packages**: \`^0.12.15\` only matches \`>=0.12.15 <0.13.0\` — a minor bump is effectively a breaking change for all consumers.
- **1.x+ packages**: \`^1.3.12\` matches \`>=1.3.12 <2.0.0\` — minor/patch are safe, but a major bump breaks all consumers.

This check is informational — the PR can still be merged if this is intentional.
`,
  );
});

test("runCheck walks a workspace:^ edge from a changeset to its dependent", () => {
  const root = createWorkspace(
    [
      { name: "@fixture/dep", version: "0.12.15" },
      {
        name: "@fixture/consumer",
        version: "1.0.0",
        dependencies: { "@fixture/dep": "workspace:^" },
      },
    ],
    { "shy-pots-shave.md": '"@fixture/dep": minor' },
  );
  try {
    const { bumps, violations, cascade } = runCheck(root);
    assert.deepEqual(bumps, [
      {
        file: "shy-pots-shave.md",
        name: "@fixture/dep",
        bumpType: "minor",
        version: "0.12.15",
      },
    ]);
    assert.deepEqual(
      violations.map(({ name }) => name),
      ["@fixture/dep"],
    );
    assert.deepEqual(
      cascade.map(({ name, newVersion }) => ({ name, newVersion })),
      [{ name: "@fixture/consumer", newVersion: "1.0.1" }],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCheck reads only the changesets the caller scopes it to", () => {
  const root = createWorkspace([{ name: "@fixture/dep", version: "0.12.15" }], {
    "shy-pots-shave.md": '"@fixture/dep": minor',
    "brave-cats-wave.md": '"@fixture/dep": patch',
  });
  try {
    assert.deepEqual(
      runCheck(root, new Set(["brave-cats-wave.md"])).bumps.map(
        ({ file, bumpType }) => ({ file, bumpType }),
      ),
      [{ file: "brave-cats-wave.md", bumpType: "patch" }],
    );
    assert.deepEqual(runCheck(root, new Set()).files, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a bump naming a package outside the workspace is not this check's business", () => {
  const root = createWorkspace([{ name: "@fixture/dep", version: "1.0.0" }], {
    "shy-pots-shave.md": '"@fixture/gone": major\n"@fixture/dep": patch',
  });
  try {
    assert.deepEqual(
      runCheck(root).bumps.map(({ name }) => name),
      ["@fixture/dep"],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function runExecutable(root, env = {}) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "check-changeset-semver.mjs")],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        BASE_SHA: "",
        HEAD_SHA: "",
        GITHUB_ACTIONS: "",
        GITHUB_STEP_SUMMARY: "",
        CHANGESET_SEMVER_CHECK_ROOT: root,
        ...env,
      },
    },
  );
}

test("the executable reports success and exits 0", () => {
  const root = createWorkspace([{ name: "@fixture/dep", version: "1.0.0" }], {
    "shy-pots-shave.md": '"@fixture/dep": patch',
  });
  try {
    const result = runExecutable(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /All changeset bump types are safe for current package versions\./,
      "the guard produced no verdict, so main() never ran",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the executable annotates the breaking bump and its cascade, then exits 1", () => {
  const root = createWorkspace(
    [
      { name: "@fixture/dep", version: "0.3.0" },
      {
        name: "@fixture/consumer",
        version: "0.0.5",
        dependencies: { "@fixture/dep": "workspace:^" },
      },
    ],
    { "shy-pots-shave.md": '"@fixture/dep": minor' },
  );
  const summaryFile = path.join(root, "step-summary.md");
  try {
    const result = runExecutable(root, {
      GITHUB_ACTIONS: "true",
      GITHUB_STEP_SUMMARY: summaryFile,
    });
    assert.equal(result.status, 1);
    assert.match(
      result.stdout,
      /::warning::Cascade breaks @fixture\/consumer \(0\.0\.5 → 0\.0\.6, \^0\.0\.5 consumers affected\)/,
    );
    assert.match(
      result.stdout,
      /::error::Semver-breaking bumps detected: @fixture\/dep@minor/,
    );
    assert.match(
      readFileSync(summaryFile, "utf8"),
      /## ⚠️ Semver-Breaking Changeset Detected/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function git(root, ...args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function commitAll(root, message) {
  git(root, "add", "-A");
  git(
    root,
    "-c",
    "user.name=fixture",
    "-c",
    "user.email=fixture@example.com",
    "commit",
    "-q",
    "-m",
    message,
  );
  return git(root, "rev-parse", "HEAD");
}

test("the executable analyzes only the changesets the PR range adds", () => {
  const root = createWorkspace([{ name: "@fixture/dep", version: "0.12.15" }], {
    "already-on-base.md": '"@fixture/dep": minor',
  });
  try {
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");
    writeFileSync(
      path.join(root, ".changeset", "added-by-the-pr.md"),
      '---\n"@fixture/dep": patch\n---\n\nfix: fixture\n',
    );
    const head = commitAll(root, "head");

    const result = runExecutable(root, { BASE_SHA: base, HEAD_SHA: head });

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(
      result.stdout,
      /\| `added-by-the-pr\.md` \| `@fixture\/dep` \| 0\.12\.15 \| patch \|/,
    );
    assert.doesNotMatch(
      result.stdout,
      /already-on-base/,
      "a changeset the PR did not touch was analyzed",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a PR range that touches no changeset ends the run before any summary", () => {
  const root = createWorkspace([{ name: "@fixture/dep", version: "0.12.15" }], {
    "already-on-base.md": '"@fixture/dep": minor',
  });
  try {
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");
    writeFileSync(
      path.join(root, "packages", "dep", "index.js"),
      "export default 1;\n",
    );
    const head = commitAll(root, "head");

    const result = runExecutable(root, { BASE_SHA: base, HEAD_SHA: head });

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /No changeset files changed in this PR\./);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an unusable base falls back to every changeset and says so", () => {
  const root = createWorkspace([{ name: "@fixture/dep", version: "0.12.15" }], {
    "shy-pots-shave.md": '"@fixture/dep": minor',
  });
  try {
    const result = runExecutable(root, {
      BASE_SHA: "0000000000000000000000000000000000000000",
      HEAD_SHA: "1111111111111111111111111111111111111111",
    });

    assert.equal(result.status, 1);
    assert.match(result.stdout, /Could not diff against base/);
    assert.match(result.stdout, /shy-pots-shave\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a changeset with no releasable bump ends the run before any summary", () => {
  const root = createWorkspace([{ name: "@fixture/dep", version: "1.0.0" }], {
    "shy-pots-shave.md": '"@fixture/gone": patch',
  });
  try {
    const result = runExecutable(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No package bumps found in changesets\./);
    assert.doesNotMatch(result.stdout, /Changeset Impact Summary/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
