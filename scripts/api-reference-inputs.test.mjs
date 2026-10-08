import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  API_REFERENCE_INPUTS,
  hasApiReferenceInputs,
} from "./api-reference-inputs.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const script = path.join(repoRoot, "scripts/api-reference-inputs.mjs");

test("detects API reference source and generator changes", () => {
  for (const file of [
    "packages/react/src/index.ts",
    "packages/core/src/index.ts",
    "apps/docs/scripts/generated-docs/render.mts",
    "apps/docs/content/types-to-generate/typeDocs.ts",
    "apps/docs/content/docs/(reference)/api-reference/meta.json",
    "apps/docs/package.json",
    "scripts/api-reference-inputs.mjs",
    ".github/workflows/autofix.yaml",
    ".github/workflows/code-quality.yaml",
  ]) {
    assert.equal(hasApiReferenceInputs([file]), true, file);
  }
});

test("ignores unrelated and similarly prefixed paths", () => {
  for (const file of [
    "packages/react-native/src/index.ts",
    "packages/core-utils/src/index.ts",
    "apps/docs/content/docs/guides/voice.mdx",
    "examples/with-ai-sdk/app/page.tsx",
    "README.md",
  ]) {
    assert.equal(hasApiReferenceInputs([file]), false, file);
  }
  assert.equal(hasApiReferenceInputs([]), false);
});

test("package README-only changes do not regenerate API reference pages", () => {
  const readmes = API_REFERENCE_INPUTS.filter((input) =>
    input.startsWith("packages/"),
  ).map((input) => `${input}/README.md`);
  for (const readme of readmes) {
    assert.equal(hasApiReferenceInputs([readme]), false, readme);
  }
  assert.equal(hasApiReferenceInputs(readmes), false);
});

test("README edits do not hide source, configuration, or generated page changes", () => {
  for (const file of [
    "packages/core/src/index.ts",
    "packages/core/package.json",
    "packages/core/tsconfig.json",
    "packages/core/src/README.md",
    "packages/core/README.mdx",
    "packages/core/README.md.ts",
    "packages/tap/src/core.test.ts",
    "apps/docs/scripts/generated-docs/extract.mts",
    "apps/docs/content/docs/(reference)/api-reference/README.md",
  ]) {
    assert.equal(
      hasApiReferenceInputs(["packages/core/README.md", file]),
      true,
      file,
    );
  }
});

test("the CLI reads NUL-separated paths", () => {
  const relevant = spawnSync(process.execPath, [script], {
    input: "README.md\0packages/tap/src/index.ts\0",
    encoding: "utf8",
  });
  assert.equal(relevant.status, 0, relevant.stderr);
  assert.equal(relevant.stdout, "true\n");

  const unrelated = spawnSync(process.execPath, [script], {
    input:
      "README.md\0packages/core/README.md\0examples/with-ai-sdk/app/page.tsx\0",
    encoding: "utf8",
  });
  assert.equal(unrelated.status, 0, unrelated.stderr);
  assert.equal(unrelated.stdout, "false\n");
});

test("the detector watches its own implementation", () => {
  assert.ok(API_REFERENCE_INPUTS.includes("scripts/api-reference-inputs.mjs"));
});

test("both workflows use the shared detector", () => {
  for (const workflowFile of [
    ".github/workflows/autofix.yaml",
    ".github/workflows/code-quality.yaml",
  ]) {
    const workflow = readFileSync(path.join(repoRoot, workflowFile), "utf8");
    assert.match(workflow, /node scripts\/api-reference-inputs\.mjs/);
  }

  const autofix = readFileSync(
    path.join(repoRoot, ".github/workflows/autofix.yaml"),
    "utf8",
  );
  assert.match(autofix, /if: steps\.api_ref\.outputs\.run == 'true'/);
});
