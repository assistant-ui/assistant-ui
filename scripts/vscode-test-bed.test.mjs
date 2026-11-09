import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { workspaceInputs } from "./deploy-examples-changes.mjs";
import { posixPath, readJson } from "./lib/workspace.mjs";

const root = path.resolve(import.meta.dirname, "..");
const workflow = readFileSync(
  path.join(root, ".github/workflows/vscode-test-bed.yaml"),
  "utf8",
);
const packageInputs = [
  "examples/with-vscode/package.json",
  "templates/vscode/package.json",
];
const expectedPackages = [
  ...new Set([
    "packages/x-buildutils",
    ...packageInputs.flatMap((file) =>
      workspaceInputs(root, readJson(path.join(root, file))).map(posixPath),
    ),
  ]),
].sort();

function pathsFor(event) {
  const block = workflow.match(
    new RegExp(`^  ${event}:\\n[\\s\\S]*?(?=^  \\w+:|^\\S)`, "m"),
  );
  assert.ok(block, event);
  return [...block[0].matchAll(/^      - (.+)$/gm)].map((match) =>
    posixPath(match[1].replace(/^["']|["']$/g, "")),
  );
}

for (const event of ["pull_request", "push"]) {
  const paths = pathsFor(event);
  const runsFor = (file) =>
    paths.reduce((included, pattern) => {
      const negative = pattern.startsWith("!");
      return path.posix.matchesGlob(file, negative ? pattern.slice(1) : pattern)
        ? !negative
        : included;
    }, false);

  test(`${event}: VS Code probes cover the extension and template`, () => {
    for (const file of [
      "examples/with-vscode/webview/probes.ts",
      "templates/vscode/src/extension.ts",
      "packages/vscode/src/host/router.ts",
    ]) {
      assert.equal(runsFor(file), true, file);
    }
  });

  test(`${event}: VS Code probes cover installed workspace dependencies`, () => {
    assert.deepEqual(
      paths
        .filter((pattern) => pattern.startsWith("packages/"))
        .map((pattern) => pattern.replace(/\/\*\*$/, ""))
        .sort(),
      expectedPackages,
    );
  });

  test(`${event}: package tests do not trigger VS Code probes`, () => {
    const exclusions = ["!packages/**/*.test.ts", "!packages/**/*.test.tsx"];
    assert.deepEqual(
      paths.filter((pattern) => pattern.startsWith("!packages/")),
      exclusions,
    );
    const lastPackage = paths.findLastIndex((pattern) =>
      pattern.startsWith("packages/"),
    );
    for (const exclusion of exclusions) {
      assert.ok(paths.indexOf(exclusion) > lastPackage, exclusion);
    }
    assert.equal(runsFor("packages/vscode/src/x.test.ts"), false);
    assert.equal(runsFor("packages/vscode/src/x.test.tsx"), false);
    assert.equal(runsFor("packages/vscode/src/x.ts"), true);
  });

  test(`${event}: VS Code probes cover shared build and workflow inputs`, () => {
    for (const file of [
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "turbo.json",
      ".github/workflows/vscode-test-bed.yaml",
      "packages/x-buildutils/src/index.ts",
    ]) {
      assert.equal(runsFor(file), true, file);
    }
  });

  test(`${event}: unrelated docs, examples, and packages stay filtered out`, () => {
    for (const file of [
      "README.md",
      "scripts/lib/review-policy.mjs",
      "apps/docs/content/docs/index.mdx",
      "examples/with-ai-sdk/app/page.tsx",
      "packages/react-google-adk/src/index.ts",
    ]) {
      assert.equal(runsFor(file), false, file);
    }
  });
}
