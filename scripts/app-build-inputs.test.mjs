import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { APP_BUILD_INPUTS, hasAppBuildInputs } from "./app-build-inputs.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const script = path.join(repoRoot, "scripts/app-build-inputs.mjs");
const workflow = readFileSync(
  path.join(repoRoot, ".github/workflows/code-quality.yaml"),
  "utf8",
);
const buildAppsJob = workflow.match(
  /\n  build-apps:\n[\s\S]*?(?=\n  api-reference-drift:)/,
);
assert.ok(buildAppsJob, "Build Changed Apps job");

test("detects app build inputs", () => {
  for (const file of [
    "apps/registry/src/registry.ts",
    "apps/future-app/src/index.ts",
    "examples/with-ai-sdk-v7/app/page.tsx",
    "packages/react/src/index.ts",
    "packages/core/package.json",
    "packages/core/src/client.spec.ts",
    "packages/core/src/client.bench.ts",
    "packages/core/src/testUtils.ts",
    "packages/core/src/tests/fixture.ts",
    "packages/core/src/client.test.mts",
    "packages/core/tests/client.test.ts",
    "packages/ui/src/components/react/thread.test.tsx",
    "packages/react-devtools/src/views/thread.test.tsx",
    "packages/metro/src/transformer.test.ts",
    "apps/registry/src/registry.test.ts",
    "examples/with-ai-sdk-v7/app/page.test.tsx",
    "templates/minimal/app/page.test.tsx",
    "templates/minimal/app/page.tsx",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
    ".github/workflows/code-quality.yaml",
    "scripts/app-build-inputs.mjs",
    "scripts/app-build-inputs.test.mjs",
    "apps/docs/content/docs/index.mdx",
    "scripts/lib/script-options.mjs",
    "scripts/build-example-bundle.mjs",
    "scripts/run-example-bundles.mjs",
    "scripts/example-bundles.json",
    "scripts/package-example-bundles.mjs",
    "scripts/prepare-example-bundles.mjs",
    "scripts/example-bundles.test.mjs",
  ]) {
    assert.equal(hasAppBuildInputs([file]), true, file);
  }
});

test("ignores changes outside app builds", () => {
  for (const file of [
    "apps/docs/package.json",
    "api-surface/assistant-ui__react.ts",
    ".changeset/example.md",
    "README.md",
    "scripts/check-changesets.mjs",
    "packages/cloud/src/telemetry/index.test.ts",
    "packages/core/src/react/client/RemoteThreadList.concurrent.test.tsx",
    "packages/react/src/index.test.ts",
    "packages/x-buildutils/src/declarations.test.ts",
  ]) {
    assert.equal(hasAppBuildInputs([file]), false, file);
  }
  assert.equal(hasAppBuildInputs([]), false);
});

test("keeps real build inputs in mixed package-test changes", () => {
  const packageTest = "packages/cloud/src/telemetry/index.test.ts";
  for (const input of [
    "packages/cloud/src/telemetry/index.ts",
    "packages/ui/src/components/react/thread.test.tsx",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(hasAppBuildInputs([packageTest, input]), true, input);
    assert.equal(hasAppBuildInputs([input, packageTest]), true, input);
  }
});

test("the CLI reads NUL-separated paths", () => {
  const relevant = spawnSync(process.execPath, [script], {
    input:
      "README.md\0packages/cloud/src/telemetry/index.test.ts\0templates/minimal/app/page.tsx\0",
    encoding: "utf8",
  });
  assert.equal(relevant.status, 0, relevant.stderr);
  assert.equal(relevant.stdout, "true\n");

  const unrelated = spawnSync(process.execPath, [script], {
    input:
      "README.md\0apps/docs/package.json\0packages/cloud/src/telemetry/index.test.ts\0",
    encoding: "utf8",
  });
  assert.equal(unrelated.status, 0, unrelated.stderr);
  assert.equal(unrelated.stdout, "false\n");
});

test("the detector watches its own implementation", () => {
  for (const file of [
    "scripts/app-build-inputs.mjs",
    "scripts/app-build-inputs.test.mjs",
  ]) {
    assert.ok(APP_BUILD_INPUTS.includes(file), file);
    assert.equal(workflow.split(`      - "${file}"`).length - 1, 1, file);
  }
});

const step = (name) => {
  const match = buildAppsJob[0].match(
    new RegExp(
      `      - name: ${name}\\n[\\s\\S]*?(?=\\n      - name:|\\n  [a-z-]+:|$)`,
    ),
  );
  assert.ok(match, name);
  return match[0];
};

test("the workflow gates dependency-backed app build steps", () => {
  const detector = step("Detect app build inputs");
  assert.match(detector, /node scripts\/app-build-inputs\.mjs/);
  assert.match(detector, /BASE=HEAD\^1/);
  assert.match(detector, /BASE="\$\{\{ github\.event\.before \}\}"/);
  assert.match(
    detector,
    /git rev-parse --verify --quiet "\$\{BASE\}\^\{commit\}"/,
  );
  assert.match(detector, /git diff --name-only --no-renames -z "\$BASE" HEAD/);
  assert.match(detector, /else\n\s+run=true/);

  for (const name of [
    "Setup pnpm and node.js",
    "Install dependencies",
    "Build apps",
    "Verify standalone example bundle contracts",
  ]) {
    assert.match(
      step(name),
      /steps\.app_build_inputs\.outputs\.run == 'true'/,
      name,
    );
  }

  assert.doesNotMatch(
    step("Test app build input detector"),
    /steps\.app_build_inputs\.outputs\.run/,
  );
});
