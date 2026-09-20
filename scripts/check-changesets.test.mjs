import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
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
  findMissingPackageChangesets,
  findUnreleasablePackages,
  findChangedManifestFields,
  isReleaseRelevantPackageFile,
  parseBumpLine,
  parseWorkspaceGlobs,
  readSkipRules,
  readWorkspacePackages,
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

test("isReleaseRelevantPackageFile excludes non-release package files", () => {
  const pkg = {
    manifest: "packages/core/package.json",
    releaseFiles: ["src", "!src/internal", "plugin"],
  };
  for (const file of [
    "packages/core/src/runtime.test.ts",
    "packages/core/src/runtime.spec.tsx",
    "packages/core/src/runtime.bench.ts",
    "packages/core/src/__tests__/runtime.ts",
    "packages/core/src/tests/helper.ts",
    "packages/core/src/__fixtures__/messages.ts",
    "packages/core/src/internal/private.ts",
    "packages/core/README.md",
    "packages/core/dist/index.js",
    "packages/core/package.json",
    "apps/docs/src/page.tsx",
  ]) {
    assert.equal(isReleaseRelevantPackageFile(file, pkg), false, file);
  }

  assert.equal(
    isReleaseRelevantPackageFile("packages/core/src/runtime.ts", pkg),
    true,
  );
  assert.equal(
    isReleaseRelevantPackageFile("packages/core/plugin/index.js", pkg),
    true,
  );
  assert.equal(
    isReleaseRelevantPackageFile("packages/core/plugin/SKILL.md", pkg),
    true,
  );
  assert.equal(
    isReleaseRelevantPackageFile(
      "packages/core/src/generated/protocol.generated.ts",
      pkg,
    ),
    true,
  );
});

test("every releasable workspace package publishes its src directory", () => {
  const rules = readSkipRules(
    JSON.parse(
      readFileSync(path.join(repoRoot, ".changeset", "config.json"), "utf8"),
    ),
  );
  for (const [name, pkg] of readWorkspacePackages(repoRoot)) {
    if ((pkg.isPrivate && rules.skipsPrivate) || !pkg.hasVersion) continue;
    const packageRoot = path.posix.dirname(pkg.manifest);
    if (!existsSync(path.join(repoRoot, packageRoot, "src"))) continue;
    assert.ok(
      isReleaseRelevantPackageFile(`${packageRoot}/src/index.ts`, pkg),
      `${name} does not publish src, so --changed-packages cannot see its source edits`,
    );
  }
});

test("findMissingPackageChangesets requires each changed package bump", () => {
  const packages = new Map([
    [
      "@assistant-ui/store",
      { manifest: "packages/store/package.json", releaseFiles: ["src"] },
    ],
    [
      "@assistant-ui/core",
      { manifest: "packages/core/package.json", releaseFiles: ["src"] },
    ],
  ]);
  const changedFiles = [
    "packages/store/src/index.ts",
    "packages/core/src/index.ts",
  ];

  assert.deepEqual(
    findMissingPackageChangesets(
      packages,
      changedFiles,
      new Set(["@assistant-ui/core"]),
    ),
    [{ name: "@assistant-ui/store", files: ["packages/store/src/index.ts"] }],
  );
  assert.deepEqual(
    findMissingPackageChangesets(
      packages,
      changedFiles,
      new Set(["@assistant-ui/core", "@assistant-ui/store"]),
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
    const readme = path.join(root, "packages", "published", "README.md");
    writeFileSync(source, "export const existing = 1;\n");
    writeFileSync(testFile, "// original test\n");
    writeFileSync(readme, "# published\n");
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    writeFileSync(testFile, "// expanded test\n");
    writeFileSync(readme, "# published\n\nUsage notes.\n");
    const nonReleaseHead = commitAll(root, "tests and readme");
    assert.deepEqual(runChangedPackageCheck(root, base, nonReleaseHead), {
      changedSourceCount: 0,
      missingChangesets: [],
    });

    writeFileSync(source, "// clarified\nexport const existing = 1;\n");
    const missingHead = commitAll(root, "comment without changeset");

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

test("changed package validation skips packages that are never released", () => {
  const root = createWorkspace("---\n---\n", { ignore: ["@fixture/held"] });
  try {
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");
    for (const directory of ["held", "internal", "unversioned"]) {
      const sourceDir = path.join(root, "packages", directory, "src");
      mkdirSync(sourceDir);
      writeFileSync(
        path.join(sourceDir, "index.ts"),
        "export const value = 1;\n",
      );
    }
    const head = commitAll(root, "change skipped packages");

    assert.deepEqual(runChangedPackageCheck(root, base, head), {
      changedSourceCount: 0,
      missingChangesets: [],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("changed package validation includes private packages opted into versioning", () => {
  const root = createWorkspace("---\n---\n", {
    privatePackages: { version: true },
  });
  try {
    writeFileSync(
      path.join(root, "packages", "internal", "package.json"),
      JSON.stringify({
        name: "@fixture/internal",
        version: "1.0.0",
        private: true,
      }),
    );
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");
    const sourceDir = path.join(root, "packages", "internal", "src");
    mkdirSync(sourceDir);
    writeFileSync(
      path.join(sourceDir, "index.ts"),
      "export const value = 1;\n",
    );
    const head = commitAll(root, "change versioned private package");

    assert.deepEqual(runChangedPackageCheck(root, base, head), {
      changedSourceCount: 1,
      missingChangesets: [
        {
          fields: [],
          name: "@fixture/internal",
          files: ["packages/internal/src/index.ts"],
        },
      ],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("changed package validation handles non-ASCII paths", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n---\n\nfix: unrelated package\n',
  );
  try {
    const sourceDir = path.join(root, "packages", "published", "src");
    mkdirSync(sourceDir);
    const source = path.join(sourceDir, "café.ts");
    writeFileSync(source, "export const value = 1;\n");
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    writeFileSync(source, "export const value = 2;\n");
    const head = commitAll(root, "change non-ASCII path");

    assert.deepEqual(runChangedPackageCheck(root, base, head), {
      changedSourceCount: 1,
      missingChangesets: [
        {
          fields: [],
          files: ["packages/published/src/café.ts"],
          name: "@fixture/published",
        },
      ],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("changed package validation scans published packages outside packages", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n---\n\nfix: unrelated package\n',
  );
  try {
    writeFileSync(
      path.join(root, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n  - libs/*\n",
    );
    const sourceDir = path.join(root, "libs", "published", "plugin");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(
      path.join(root, "libs", "published", "package.json"),
      JSON.stringify({ name: "@fixture/outside", version: "1.0.0" }),
    );
    const source = path.join(sourceDir, "index.ts");
    writeFileSync(source, "export const value = 1;\n");
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    writeFileSync(source, "export const value = 2;\n");
    const head = commitAll(root, "change published package outside packages");

    assert.deepEqual(runChangedPackageCheck(root, base, head), {
      changedSourceCount: 1,
      missingChangesets: [
        {
          fields: [],
          files: ["libs/published/plugin/index.ts"],
          name: "@fixture/outside",
        },
      ],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("changed package validation ignores target branch changes after the fork", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n---\n\nfix: unrelated package\n',
  );
  try {
    const sourceDir = path.join(root, "packages", "published", "src");
    mkdirSync(sourceDir);
    const source = path.join(sourceDir, "index.ts");
    writeFileSync(source, "export const value = 1;\n");
    git(root, "init", "-q", "-b", "main");
    commitAll(root, "fork point");

    git(root, "switch", "-q", "-c", "feature");
    writeFileSync(path.join(root, "notes.txt"), "feature work\n");
    const head = commitAll(root, "change a file outside packages");

    git(root, "switch", "-q", "main");
    writeFileSync(source, "export const value = 2;\n");
    const base = commitAll(root, "change source on target");

    assert.deepEqual(runChangedPackageCheck(root, base, head), {
      changedSourceCount: 0,
      missingChangesets: [],
    });
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
          fields: [],
          files: ["packages/published/src/removed.ts"],
          name: "@fixture/published",
        },
      ],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("published code outside src requires a changeset", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n---\n\nfix: unrelated package\n',
  );
  try {
    const manifest = path.join(root, "packages", "published", "package.json");
    const pkg = JSON.parse(readFileSync(manifest, "utf8"));
    writeFileSync(
      manifest,
      JSON.stringify({
        ...pkg,
        files: ["dist", "src", "!src/internal", "plugin", "README.md"],
      }),
    );
    const pluginDir = path.join(root, "packages", "published", "plugin");
    const internalDir = path.join(
      root,
      "packages",
      "published",
      "src",
      "internal",
    );
    mkdirSync(pluginDir);
    mkdirSync(internalDir, { recursive: true });
    const plugin = path.join(pluginDir, "entry.js");
    const internal = path.join(internalDir, "private.ts");
    writeFileSync(plugin, "export const value = 1;\n");
    writeFileSync(internal, "export const privateValue = 1;\n");
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    writeFileSync(plugin, "export const value = 2;\n");
    writeFileSync(internal, "export const privateValue = 2;\n");
    const head = commitAll(root, "change published plugin");

    assert.deepEqual(runChangedPackageCheck(root, base, head), {
      changedSourceCount: 1,
      missingChangesets: [
        {
          fields: [],
          files: ["packages/published/plugin/entry.js"],
          name: "@fixture/published",
        },
      ],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("moving source between published packages requires both changesets", () => {
  const root = createWorkspace(
    '---\n"@fixture/unversioned": patch\n---\n\nfix: unrelated package\n',
  );
  try {
    mkdirSync(path.join(root, "packages", "published", "src"));
    mkdirSync(path.join(root, "packages", "held", "src"));
    writeFileSync(
      path.join(root, "packages", "published", "src", "moved.ts"),
      "export const moved = true;\n",
    );
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    git(
      root,
      "mv",
      "packages/published/src/moved.ts",
      "packages/held/src/moved.ts",
    );
    const head = commitAll(root, "move source");

    assert.deepEqual(
      runChangedPackageCheck(root, base, head).missingChangesets.map(
        ({ name }) => name,
      ),
      ["@fixture/held", "@fixture/published"],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("renaming source within a published package reports the package once", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n---\n\nfix: unrelated package\n',
  );
  try {
    const sourceDir = path.join(root, "packages", "published", "src");
    mkdirSync(sourceDir);
    writeFileSync(
      path.join(sourceDir, "before.ts"),
      "export const value = true;\n",
    );
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    git(
      root,
      "mv",
      "packages/published/src/before.ts",
      "packages/published/src/after.ts",
    );
    const head = commitAll(root, "rename source");

    assert.deepEqual(runChangedPackageCheck(root, base, head), {
      changedSourceCount: 2,
      missingChangesets: [
        {
          fields: [],
          name: "@fixture/published",
          files: [
            "packages/published/src/after.ts",
            "packages/published/src/before.ts",
          ],
        },
      ],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("changed package validation bounds file lists in errors", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n---\n\nfix: unrelated package\n',
  );
  try {
    const sourceDir = path.join(root, "packages", "published", "src");
    mkdirSync(sourceDir);
    for (let index = 0; index < 7; index++) {
      writeFileSync(
        path.join(sourceDir, `file-${index}.ts`),
        `export const value${index} = 1;\n`,
      );
    }
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    for (let index = 0; index < 7; index++) {
      writeFileSync(
        path.join(sourceDir, `file-${index}.ts`),
        `export const value${index} = 2;\n`,
      );
    }
    const head = commitAll(root, "change many source files");
    const result = runExecutable(root, {
      args: ["--changed-packages"],
      env: { BASE_SHA: base, HEAD_SHA: head },
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /file-0\.ts/);
    assert.match(result.stderr, /and 2 more/);
    assert.doesNotMatch(result.stderr, /file-6\.ts/);
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
    const manifest = path.join(root, "packages", "published", "package.json");
    writeFileSync(
      manifest,
      JSON.stringify({
        name: "@fixture/published",
        version: "1.0.0",
        dependencies: { "@fixture/held": "^1.0.0", zod: "^4.0.0" },
        peerDependencies: { "@fixture/held": "^1.0.0" },
      }),
    );
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    writeFileSync(
      manifest,
      JSON.stringify({
        name: "@fixture/published",
        version: "1.0.1",
        dependencies: { "@fixture/held": "^1.0.1", zod: "^4.0.0" },
        peerDependencies: { "@fixture/held": "^1.0.1" },
      }),
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

test("findChangedManifestFields ignores what a release rewrites", () => {
  const workspaceNames = new Set(["@fixture/held"]);
  const base = {
    name: "@fixture/published",
    version: "1.0.0",
    scripts: { build: "aui-build" },
    devDependencies: { vitest: "^4.0.0" },
    dependencies: { "@fixture/held": "^1.0.0", zod: "^4.0.0" },
    peerDependencies: { "@fixture/held": "^1.0.0" },
    exports: { ".": { types: "./dist/index.d.ts" } },
  };
  assert.deepEqual(
    findChangedManifestFields(
      base,
      {
        version: "1.0.1",
        name: "@fixture/published",
        scripts: { build: "aui-build", typecheck: "tsc --noEmit" },
        devDependencies: { vitest: "^5.0.0" },
        peerDependencies: { "@fixture/held": "^1.0.1" },
        dependencies: { zod: "^4.0.0", "@fixture/held": "^1.0.1" },
        exports: { ".": { types: "./dist/index.d.ts" } },
      },
      workspaceNames,
    ),
    [],
  );
  assert.deepEqual(
    findChangedManifestFields(
      base,
      {
        ...base,
        dependencies: { "@fixture/held": "^1.0.0", zod: "^5.0.0" },
        exports: { ".": { types: "./dist/index.d.ts" }, "./edge": {} },
        files: ["dist"],
      },
      workspaceNames,
    ),
    ["dependencies", "exports", "files"],
  );
});

test("findChangedManifestFields watches the workspace dependency name set", () => {
  const workspaceNames = new Set(["@fixture/held"]);
  const base = {
    name: "@fixture/published",
    dependencies: { "@fixture/held": "^1.0.0", zod: "^4.0.0" },
    peerDependencies: {},
  };
  assert.deepEqual(
    findChangedManifestFields(
      base,
      {
        ...base,
        dependencies: { "@fixture/held": "^1.0.1", zod: "^4.0.0" },
      },
      workspaceNames,
    ),
    [],
  );
  assert.deepEqual(
    findChangedManifestFields(
      base,
      { ...base, dependencies: { zod: "^4.0.0" } },
      workspaceNames,
    ),
    ["dependencies"],
  );
  assert.deepEqual(
    findChangedManifestFields(
      base,
      {
        ...base,
        dependencies: { zod: "^4.0.0" },
        peerDependencies: { "@fixture/held": "^1.0.0" },
      },
      workspaceNames,
    ),
    ["dependencies", "peerDependencies"],
  );
});

test("findChangedManifestFields watches the scripts a consumer runs", () => {
  const base = {
    name: "@fixture/published",
    scripts: { build: "aui-build", prepublishOnly: "aui-build" },
  };
  assert.deepEqual(
    findChangedManifestFields(
      base,
      { ...base, scripts: { build: "tsc", prepack: "aui-build" } },
      new Set(),
    ),
    [],
  );
  for (const script of ["preinstall", "install", "postinstall"]) {
    assert.deepEqual(
      findChangedManifestFields(
        base,
        { ...base, scripts: { ...base.scripts, [script]: "node setup.js" } },
        new Set(),
      ),
      ["scripts"],
      script,
    );
  }
});

test("a published manifest edit requires a changeset", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n---\n\nfix: unrelated package\n',
  );
  try {
    const manifest = path.join(root, "packages", "published", "package.json");
    writeFileSync(
      manifest,
      JSON.stringify({
        name: "@fixture/published",
        version: "1.0.0",
        exports: { ".": "./dist/index.js" },
        scripts: { build: "aui-build" },
        devDependencies: { vitest: "^4.0.0" },
        dependencies: { zod: "^4.0.0" },
      }),
    );
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    writeFileSync(
      manifest,
      JSON.stringify({
        name: "@fixture/published",
        version: "1.0.0",
        exports: { ".": "./dist/index.js" },
        scripts: { build: "aui-build", typecheck: "tsc --noEmit" },
        devDependencies: { vitest: "^5.0.0" },
        dependencies: { zod: "^4.0.0" },
      }),
    );
    const inertHead = commitAll(root, "scripts and devDependencies");
    assert.deepEqual(runChangedPackageCheck(root, base, inertHead), {
      changedSourceCount: 0,
      missingChangesets: [],
    });

    writeFileSync(
      manifest,
      JSON.stringify({
        name: "@fixture/published",
        version: "1.0.0",
        exports: { ".": "./dist/index.js", "./edge": "./dist/edge.js" },
        files: ["dist"],
        scripts: { build: "aui-build", typecheck: "tsc --noEmit" },
        devDependencies: { vitest: "^5.0.0" },
        dependencies: { zod: "^5.0.0" },
      }),
    );
    const missingHead = commitAll(root, "widen the published surface");
    assert.deepEqual(runChangedPackageCheck(root, base, missingHead), {
      changedSourceCount: 0,
      missingChangesets: [
        {
          fields: ["dependencies", "exports", "files"],
          files: [],
          name: "@fixture/published",
        },
      ],
    });
    const missingResult = runExecutable(root, {
      args: ["--changed-packages"],
      env: { BASE_SHA: base, HEAD_SHA: missingHead },
    });
    assert.equal(missingResult.status, 1);
    assert.match(
      missingResult.stderr,
      /"@fixture\/published" \(package\.json: dependencies, exports, files\)/,
    );

    writeFileSync(
      path.join(root, ".changeset", "added-by-pr.md"),
      '---\n"@fixture/published": patch\n---\n\nfeat: publish the edge entry\n',
    );
    const coveredHead = commitAll(root, "add changeset");
    assert.deepEqual(runChangedPackageCheck(root, base, coveredHead), {
      changedSourceCount: 0,
      missingChangesets: [],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a manifest and source change report one entry", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n---\n\nfix: unrelated package\n',
  );
  try {
    const sourceDir = path.join(root, "packages", "published", "src");
    mkdirSync(sourceDir);
    const source = path.join(sourceDir, "index.ts");
    const manifest = path.join(root, "packages", "published", "package.json");
    writeFileSync(source, "export const value = 1;\n");
    writeFileSync(
      manifest,
      JSON.stringify({ name: "@fixture/published", version: "1.0.0" }),
    );
    git(root, "init", "-q", "-b", "main");
    const base = commitAll(root, "base");

    writeFileSync(source, "export const value = 2;\n");
    writeFileSync(
      manifest,
      JSON.stringify({
        name: "@fixture/published",
        version: "1.0.0",
        sideEffects: false,
      }),
    );
    const head = commitAll(root, "source and manifest");

    assert.deepEqual(runChangedPackageCheck(root, base, head), {
      changedSourceCount: 1,
      missingChangesets: [
        {
          fields: ["sideEffects"],
          files: ["packages/published/src/index.ts"],
          name: "@fixture/published",
        },
      ],
    });
    const result = runExecutable(root, {
      args: ["--changed-packages"],
      env: { BASE_SHA: base, HEAD_SHA: head },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /index\.ts; package\.json: sideEffects/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("manifest validation ignores target branch changes after the fork", () => {
  const root = createWorkspace(
    '---\n"@fixture/held": patch\n---\n\nfix: unrelated package\n',
  );
  try {
    const manifest = path.join(root, "packages", "published", "package.json");
    writeFileSync(
      manifest,
      JSON.stringify({ name: "@fixture/published", version: "1.0.0" }),
    );
    git(root, "init", "-q", "-b", "main");
    commitAll(root, "fork point");

    git(root, "switch", "-q", "-c", "feature");
    writeFileSync(
      manifest,
      JSON.stringify({
        name: "@fixture/published",
        version: "1.0.0",
        scripts: { build: "aui-build" },
      }),
    );
    const head = commitAll(root, "inert manifest edit on the feature branch");

    git(root, "switch", "-q", "main");
    writeFileSync(
      manifest,
      JSON.stringify({
        name: "@fixture/published",
        version: "1.0.0",
        sideEffects: false,
      }),
    );
    const base = commitAll(root, "publish-relevant edit on target");

    assert.deepEqual(runChangedPackageCheck(root, base, head), {
      changedSourceCount: 0,
      missingChangesets: [],
    });
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
    assert.doesNotMatch(result.stderr, /^\s+at /m);
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
