import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  findUnreleasablePackages,
  parseBumpLine,
  parseWorkspaceGlobs,
  runCheck,
} from "./check-changesets.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

function createWorkspace(changeset) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-changesets-"));
  writeFileSync(
    path.join(root, "pnpm-workspace.yaml"),
    "packages:\n  - packages/*\n\nlinkWorkspacePackages: true\n",
  );
  for (const [dir, manifest] of [
    ["published", { name: "@fixture/published", version: "1.0.0" }],
    ["internal", { name: "@fixture/internal", private: true }],
  ]) {
    mkdirSync(path.join(root, "packages", dir), { recursive: true });
    writeFileSync(
      path.join(root, "packages", dir, "package.json"),
      JSON.stringify(manifest),
    );
  }
  mkdirSync(path.join(root, ".changeset"));
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
      { manifest: "packages/core/package.json", isPrivate: false },
    ],
    [
      "@assistant-ui/vue",
      { manifest: "packages/vue/package.json", isPrivate: true },
    ],
  ]);

  assert.deepEqual(
    findUnreleasablePackages(packages, [
      { file: "a.md", name: "@assistant-ui/core" },
    ]),
    [],
  );

  const problems = findUnreleasablePackages(packages, [
    { file: "a.md", name: "@assistant-ui/vue" },
    { file: "a.md", name: "@assistant-ui/nope" },
  ]);
  assert.equal(problems.length, 2);
  assert.match(
    problems[0].reason,
    /is private \(packages\/vue\/package\.json\)/,
  );
  assert.match(problems[1].reason, /is not a workspace package/);
});

test("runCheck accepts a workspace whose changesets are all releasable", () => {
  const root = createWorkspace(
    '---\n"@fixture/published": patch\n---\n\nfix: something\n',
  );
  try {
    assert.deepEqual(runCheck(root), { packageCount: 2, problems: [] });
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

test("the executable runs main() instead of exiting silently", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "check-changesets.mjs")],
    { encoding: "utf8" },
  );
  assert.match(
    result.stdout + result.stderr,
    /All changeset bumps name releasable workspace packages\.|Changesets name packages that cannot be released:/,
    "the guard produced no verdict, so main() never ran",
  );
});
