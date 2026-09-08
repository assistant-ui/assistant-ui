import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  findMissingPackageChangesets,
  findUnreleasablePackages,
  isReleaseRelevantSourceFile,
  parseBumpLine,
  parseWorkspaceGlobs,
  readSkipRules,
  runChangedPackageCheck,
  runCheck,
} from "./check-changesets.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

function createWorkspace(changeset, config = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-changesets-"));
  writeFileSync(
    path.join(root, "pnpm-workspace.yaml"),
    "packages:\n  - packages/*\n\nlinkWorkspacePackages: true\n",
  );
  for (const [dir, manifest] of [
    ["published", { name: "@fixture/published", version: "1.0.0" }],
    ["held", { name: "@fixture/held", version: "1.0.0" }],
    ["unversioned", { name: "@fixture/unversioned" }],
    ["internal", { name: "@fixture/internal", private: true }],
  ]) {
    mkdirSync(path.join(root, "packages", dir), { recursive: true });
    writeFileSync(
      path.join(root, "packages", dir, "package.json"),
      JSON.stringify(manifest),
    );
  }
  mkdirSync(path.join(root, ".changeset"));
  writeFileSync(
    path.join(root, ".changeset", "config.json"),
    JSON.stringify({ privatePackages: { version: false }, ...config }),
  );
  writeFileSync(path.join(root, ".changeset", "entry.md"), changeset);
  return root;
}

test("parseBumpLine reads every quoting style changesets accepts", () => {
  for (const line of [
    '"@assistant-ui/vue": patch',
    "'@assistant-ui/vue': patch",
    "@assistant-ui/vue: patch",
    '"@assistant-ui/vue": "patch"',
    "\"@assistant-ui/vue\": 'patch'",
    '"@assistant-ui/vue": patch # keeps the release train moving',
    '"@assistant-ui/vue": "patch" # keeps the release train moving',
    '  "@assistant-ui/vue": patch  ',
  ]) {
    assert.deepEqual(
      parseBumpLine(line),
      { name: "@assistant-ui/vue", bump: "patch" },
      line,
    );
  }
});

test("parseBumpLine ignores lines that are not bumps", () => {
  for (const line of [
    "",
    "---",
    '# "@assistant-ui/vue": patch',
    '"@assistant-ui/vue": prerelease',
    '"@assistant-ui/vue"',
  ]) {
    assert.equal(parseBumpLine(line), null, line);
  }
});

test("parseBumpLine keeps every bump level", () => {
  assert.equal(parseBumpLine('"a": minor')?.bump, "minor");
  assert.equal(parseBumpLine('"a": major')?.bump, "major");
});

test("parseWorkspaceGlobs survives comments and blank lines", () => {
  assert.deepEqual(
    parseWorkspaceGlobs(
      [
        "packages:",
        "  - api-surface",
        "",
        "  # the published libraries",
        "  - packages/*",
        '  - "apps/*"',
        "  - templates/* # starters",
        "",
        "linkWorkspacePackages: true",
        "  - never/reached",
      ].join("\n"),
    ),
    ["api-surface", "packages/*", "apps/*", "templates/*"],
  );
});

test("parseWorkspaceGlobs matches the repo's own workspace file", () => {
  assert.deepEqual(
    parseWorkspaceGlobs(
      "packages:\n  - api-surface\n  - packages/*\n  - examples/*\n  - apps/*\n  - templates/*\n\nlinkWorkspacePackages: true\n",
    ),
    ["api-surface", "packages/*", "examples/*", "apps/*", "templates/*"],
  );
});

test("findUnreleasablePackages flags private and unknown names", () => {
  const packages = new Map([
    [
      "@assistant-ui/core",
      {
        manifest: "packages/core/package.json",
        isPrivate: false,
        hasVersion: true,
      },
    ],
    [
      "@assistant-ui/vue",
      {
        manifest: "packages/vue/package.json",
        isPrivate: true,
        hasVersion: false,
      },
    ],
  ]);

  const rules = { ignored: [], skipsPrivate: true };

  assert.deepEqual(
    findUnreleasablePackages(
      packages,
      [{ file: "a.md", name: "@assistant-ui/core" }],
      rules,
    ),
    [],
  );

  const problems = findUnreleasablePackages(
    packages,
    [
      { file: "a.md", name: "@assistant-ui/vue" },
      { file: "a.md", name: "@assistant-ui/nope" },
    ],
    rules,
  );
  assert.equal(problems.length, 2);
  assert.match(
    problems[0].reason,
    /is private \(packages\/vue\/package\.json\)/,
  );
  assert.match(problems[1].reason, /is not a workspace package/);
});

test("isReleaseRelevantSourceFile excludes non-release source files", () => {
  for (const file of [
    "packages/core/src/runtime.test.ts",
    "packages/core/src/runtime.spec.tsx",
    "packages/core/src/runtime.stories.tsx",
    "packages/core/src/runtime.bench.ts",
    "packages/core/src/__tests__/runtime.ts",
    "packages/core/src/tests/helper.ts",
    "packages/core/src/fixtures/messages.ts",
    "packages/core/src/generated/protocol.ts",
    "packages/core/src/protocol.generated.ts",
    "apps/docs/src/page.tsx",
  ]) {
    assert.equal(isReleaseRelevantSourceFile(file), false, file);
  }

  assert.equal(
    isReleaseRelevantSourceFile("packages/core/src/runtime.ts"),
    true,
  );
});

test("findMissingPackageChangesets requires each changed package bump", () => {
  const packages = new Map([
    [
      "@assistant-ui/store",
      {
        manifest: "packages/store/package.json",
        isPrivate: false,
        hasVersion: true,
      },
    ],
    [
      "@assistant-ui/core",
      {
        manifest: "packages/core/package.json",
        isPrivate: false,
        hasVersion: true,
      },
    ],
  ]);
  const changedFiles = new Set(["packages/store/src/index.ts"]);
  const rules = { ignored: [], skipsPrivate: true };

  assert.deepEqual(
    findMissingPackageChangesets(
      packages,
      [{ file: "core.md", name: "@assistant-ui/core" }],
      changedFiles,
      rules,
    ),
    [
      {
        files: ["packages/store/src/index.ts"],
        name: "@assistant-ui/store",
      },
    ],
  );
  assert.deepEqual(
    findMissingPackageChangesets(
      packages,
      [{ file: "store.md", name: "@assistant-ui/store" }],
      changedFiles,
      rules,
    ),
    [],
  );
});

test("runCheck accepts a workspace whose changesets are all releasable", () => {
  const root = createWorkspace(
    '---\n"@fixture/published": patch\n---\n\nfix: something\n',
  );
  try {
    assert.deepEqual(runCheck(root), { packageCount: 4, problems: [] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCheck rejects a versionless package mixed with a released package", () => {
  const root = createWorkspace(
    '---\n"@fixture/unversioned": patch\n"@fixture/published": patch\n---\n\nfix: something\n',
  );
  try {
    const { problems } = runCheck(root);
    assert.equal(problems.length, 1);
    assert.equal(problems[0].name, "@fixture/unversioned");
    assert.match(problems[0].reason, /has no version/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCheck allows a versionless-only changeset", () => {
  const root = createWorkspace(
    '---\n"@fixture/unversioned": patch\n---\n\nfix: something\n',
  );
  try {
    assert.deepEqual(runCheck(root).problems, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCheck allows an ignored package sharing a changeset with a versionless one", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n"@fixture/unversioned": patch\n---\n\nfix: something\n',
    { ignore: ["@fixture/held"] },
  );
  try {
    assert.deepEqual(runCheck(root).problems, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCheck rejects a changeset naming a private package", () => {
  const root = createWorkspace(
    '---\n"@fixture/published": patch\n"@fixture/internal": "patch" # slipped past the old matcher\n---\n\nfix: something\n',
  );
  try {
    const { problems } = runCheck(root);
    assert.equal(problems.length, 1);
    assert.equal(problems[0].name, "@fixture/internal");
    assert.match(problems[0].reason, /is private/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readSkipRules follows .changeset/config.json", () => {
  assert.deepEqual(readSkipRules({}), {
    ignored: [],
    skipsPrivate: true,
  });
  assert.deepEqual(readSkipRules({ privatePackages: { version: true } }), {
    ignored: [],
    skipsPrivate: false,
  });
  assert.deepEqual(readSkipRules({ privatePackages: true }), {
    ignored: [],
    skipsPrivate: false,
  });
  assert.deepEqual(readSkipRules({ ignore: ["@fixture/held"] }), {
    ignored: ["@fixture/held"],
    skipsPrivate: true,
  });
});

test("runCheck allows an ignored-only changeset", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n---\n\nfix: something\n',
    { ignore: ["@fixture/held"] },
  );
  try {
    assert.deepEqual(runCheck(root).problems, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCheck rejects a changeset mixing ignored and released packages", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n"@fixture/published": patch\n---\n\nfix: something\n',
    { ignore: ["@fixture/held"] },
  );
  try {
    const { problems } = runCheck(root);
    assert.equal(problems.length, 1);
    assert.equal(problems[0].name, "@fixture/held");
    assert.match(problems[0].reason, /shares a changeset/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCheck expands ordered ignore globs", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n"@fixture/published": patch\n---\n\nfix: something\n',
    { ignore: ["@fixture/*", "!@fixture/published"] },
  );
  try {
    const { problems } = runCheck(root);
    assert.equal(problems.length, 1);
    assert.equal(problems[0].name, "@fixture/held");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCheck allows a private package when the config versions it", () => {
  const root = createWorkspace(
    '---\n"@fixture/internal": patch\n---\n\nfix: something\n',
    { privatePackages: { version: true } },
  );
  try {
    assert.deepEqual(runCheck(root).problems, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function commitAll(root, message) {
  git(root, "add", ".");
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

function runExecutable(root, { args = [], env = {} } = {}) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "check-changesets.mjs"), ...args],
    {
      encoding: "utf8",
      env: { ...process.env, CHANGESET_CHECK_ROOT: root, ...env },
    },
  );
}

test("changed package validation ignores non-release edits and requires a PR changeset", () => {
  const root = createWorkspace(
    '---\n"@fixture/published": patch\n---\n\nfix: already on base\n',
  );
  try {
    const sourceDir = path.join(root, "packages", "published", "src");
    mkdirSync(sourceDir);
    const source = path.join(sourceDir, "index.ts");
    const testFile = path.join(sourceDir, "index.test.ts");
    writeFileSync(source, "// original\nexport const existing = 1;\n");
    writeFileSync(testFile, "// original test\n");
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    writeFileSync(source, "// clarified\nexport const existing = 1;\n");
    writeFileSync(testFile, "// expanded test\n");
    const nonReleaseHead = commitAll(root, "comments and tests");
    assert.deepEqual(runChangedPackageCheck(root, base, nonReleaseHead), {
      changedSourceCount: 0,
      missingChangesets: [],
    });

    writeFileSync(
      source,
      "// clarified\nexport const existing = 1;\nexport const added = 2;\n",
    );
    const missingHead = commitAll(root, "source without changeset");

    assert.deepEqual(
      runChangedPackageCheck(root, base, missingHead).missingChangesets.map(
        ({ name }) => name,
      ),
      ["@fixture/published"],
    );
    const missingResult = runExecutable(root, {
      args: ["--changed-packages"],
      env: { BASE_SHA: base, HEAD_SHA: missingHead },
    });
    assert.equal(missingResult.status, 1);
    assert.match(missingResult.stderr, /"@fixture\/published"/);

    writeFileSync(
      path.join(root, ".changeset", "added-by-pr.md"),
      '---\n"@fixture/published": patch\n---\n\nfeat: publish added type\n',
    );
    const coveredHead = commitAll(root, "add changeset");
    const coveredResult = runExecutable(root, {
      args: ["--changed-packages"],
      env: { BASE_SHA: base, HEAD_SHA: coveredHead },
    });

    assert.equal(
      coveredResult.status,
      0,
      coveredResult.stdout + coveredResult.stderr,
    );
    assert.match(
      coveredResult.stdout,
      /All changed published packages have changesets\./,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("deleting published source requires a changeset", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n---\n\nfix: unrelated package\n',
  );
  try {
    const sourceDir = path.join(root, "packages", "published", "src");
    mkdirSync(sourceDir);
    const source = path.join(sourceDir, "removed.ts");
    writeFileSync(source, "export const removed = true;\n");
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    rmSync(source);
    const head = commitAll(root, "delete source");

    assert.deepEqual(runChangedPackageCheck(root, base, head), {
      changedSourceCount: 1,
      missingChangesets: [
        {
          files: ["packages/published/src/removed.ts"],
          name: "@fixture/published",
        },
      ],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a version-only PR passes without a branch-name exemption", () => {
  const root = createWorkspace(
    '---\n"@fixture/published": patch\n---\n\nfix: release\n',
  );
  try {
    const sourceDir = path.join(root, "packages", "published", "src");
    mkdirSync(sourceDir);
    writeFileSync(
      path.join(sourceDir, "index.ts"),
      "export const value = 1;\n",
    );
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    const manifest = path.join(root, "packages", "published", "package.json");
    writeFileSync(
      manifest,
      JSON.stringify({ name: "@fixture/published", version: "1.0.1" }),
    );
    rmSync(path.join(root, ".changeset", "entry.md"));
    const head = commitAll(root, "version packages");

    assert.deepEqual(runChangedPackageCheck(root, base, head), {
      changedSourceCount: 0,
      missingChangesets: [],
    });
    const result = runExecutable(root, {
      args: ["--changed-packages"],
      env: { BASE_SHA: base, HEAD_SHA: head },
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("changed package validation reports an unresolvable range", () => {
  const root = createWorkspace(
    '---\n"@fixture/published": patch\n---\n\nfix: fixture\n',
  );
  try {
    git(root, "init", "-q", "-b", "main");
    const head = commitAll(root, "base");
    const result = runExecutable(root, {
      args: ["--changed-packages"],
      env: { BASE_SHA: "missing-base", HEAD_SHA: head },
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not diff missing-base/);
    assert.doesNotMatch(result.stderr, /at diffChangedFiles/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the executable reports success and exits 0", () => {
  const root = createWorkspace(
    '---\n"@fixture/published": patch\n---\n\nfix: something\n',
  );
  try {
    const result = runExecutable(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /All changeset bumps name releasable workspace packages\./,
      "the guard produced no verdict, so main() never ran",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the executable reports the offending line and exits 1", () => {
  const root = createWorkspace(
    '---\n"@fixture/published": patch\n"@fixture/internal": patch\n---\n\nfix: something\n',
  );
  try {
    const result = runExecutable(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /"@fixture\/internal" is private/);
    assert.match(result.stderr, /entry\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
