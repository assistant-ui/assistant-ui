import assert from "node:assert/strict";
import test from "node:test";
import {
  findUnreleasablePackages,
  parseBumpLine,
  parseWorkspaceGlobs,
} from "./check-changesets.mjs";

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
