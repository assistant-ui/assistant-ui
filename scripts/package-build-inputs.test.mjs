import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  PACKAGE_BUILD_INPUTS,
  hasPackageBuildInputs,
} from "./package-build-inputs.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const script = path.join(repoRoot, "scripts/package-build-inputs.mjs");
const workflow = readFileSync(
  path.join(repoRoot, ".github/workflows/code-quality.yaml"),
  "utf8",
);
const buildJob = workflow.match(/\n  build:\n[\s\S]*?(?=\n  build-apps:)/);
assert.ok(buildJob, "Build Changed Packages job");

test("detects package build and checker inputs", () => {
  for (const file of [
    "packages/react/src/index.ts",
    "api-surface/assistant-ui__react.ts",
    "scripts/check-built-declarations.mjs",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
    ".github/workflows/code-quality.yaml",
    ".github/workflows/deploy-examples.yaml",
    "examples/with-expo/package.json",
  ]) {
    assert.equal(hasPackageBuildInputs([file]), true, file);
  }
});

test("ignores changes outside the package build job", () => {
  for (const file of [
    "apps/docs/content/docs/index.mdx",
    "examples/with-expo/app/index.tsx",
    "templates/minimal/app/page.tsx",
    ".changeset/example.md",
    "README.md",
    "packages-extra/react/src/index.ts",
  ]) {
    assert.equal(hasPackageBuildInputs([file]), false, file);
  }
  assert.equal(hasPackageBuildInputs([]), false);
});

test("the CLI reads NUL-separated paths", () => {
  const relevant = spawnSync(process.execPath, [script], {
    input: "README.md\0packages/tap/src/index.ts\0",
    encoding: "utf8",
  });
  assert.equal(relevant.status, 0, relevant.stderr);
  assert.equal(relevant.stdout, "true\n");

  const unrelated = spawnSync(process.execPath, [script], {
    input: "README.md\0examples/with-ai-sdk-v7/app/page.tsx\0",
    encoding: "utf8",
  });
  assert.equal(unrelated.status, 0, unrelated.stderr);
  assert.equal(unrelated.stdout, "false\n");
});

test("the detector watches its own implementation", () => {
  assert.ok(PACKAGE_BUILD_INPUTS.includes("scripts"));
});

const step = (name) => {
  const match = buildJob[0].match(
    new RegExp(
      `      - name: ${name}\\n[\\s\\S]*?(?=\\n      - name:|\\n  [a-z-]+:|$)`,
    ),
  );
  assert.ok(match, name);
  return match[0];
};

test("the workflow gates dependency-backed package steps", () => {
  assert.match(
    step("Detect package build inputs"),
    /node scripts\/package-build-inputs\.mjs/,
  );

  for (const name of [
    "Setup pnpm and node.js",
    "Install dependencies",
    "Build packages",
    "Check API surface",
    "Check distribution barrels",
    "Check built declarations",
    "Test built declaration checker",
    "Test the distribution barrel checker",
    "Test the deploy examples planner",
    "Test API surface generator",
    "Test API reference input detector",
    "Test package build input detector",
    "Measure bundle sizes against the base",
  ]) {
    assert.match(
      step(name),
      /steps\.package_build_inputs\.outputs\.run == 'true'/,
      name,
    );
  }

  assert.doesNotMatch(
    step("Post the size report as a sticky PR comment"),
    /steps\.package_build_inputs\.outputs\.run/,
  );
});
