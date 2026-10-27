import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  APP_BUILD_INPUTS,
  hasAppBuildInputs,
  hasExampleBundleInputs,
} from "./app-build-inputs.mjs";

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
    "scripts/lib/package-test-inputs.mjs",
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

test("standalone bundles skip unrelated adapter changes", () => {
  const result = spawnSync(process.execPath, [script, "--bundles"], {
    input:
      "packages/react-ag-ui/src/runtime/adapter/conversions.ts\0packages/react-langchain/src/convertMessages.ts\0",
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "false\n");
});

test("standalone bundles retain source, CSS, packaging, and guide inputs", () => {
  for (const file of [
    "examples/bundle-ai-sdk/src/main.tsx",
    "examples/bundle-shared/transport.test.mjs",
    "packages/core/src/types/message.ts",
    "packages/react-markdown/src/index.ts",
    "packages/ui/src/components/react/assistant-ui/elements/thread.aui.test.tsx",
    "packages/x-buildutils/src/index.ts",
    "apps/docs/content/docs/runtimes/ai-sdk/v7.mdx",
    "scripts/package-example-bundles.mjs",
    "scripts/example-bundles.test.mjs",
    "scripts/example-bundles.json",
    "scripts/app-build-inputs.mjs",
    "scripts/app-build-inputs.test.mjs",
    "scripts/lib/workspace.mjs",
    "scripts/lib/main.mjs",
    "turbo.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    ".github/workflows/code-quality.yaml",
    "packages/removed-dependency/package.json",
  ]) {
    assert.equal(hasExampleBundleInputs([file]), true, file);
  }
});

test("standalone bundles ignore unrelated apps, templates, and isolated package tests", () => {
  assert.equal(hasExampleBundleInputs([]), false);
  const unrelated = [
    "apps/registry/src/registry.ts",
    "apps/docs/components/layout.tsx",
    "examples/with-langgraph/app/page.tsx",
    "templates/minimal/app/page.tsx",
    "packages/core/src/runtime/message.test.ts",
    "packages/react-lexical/src/index.ts",
    "README.md",
  ];
  assert.equal(hasExampleBundleInputs(unrelated), false);
  assert.equal(hasAppBuildInputs(unrelated), true);
  assert.equal(
    hasExampleBundleInputs([...unrelated, "examples/bundle-shared/styles.css"]),
    true,
  );
});

function bundleFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-bundle-inputs-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(
      path.join(root, file),
      typeof value === "string" ? value : JSON.stringify(value),
    );
  };
  write("pnpm-workspace.yaml", "packages:\n  - packages/*\n  - examples/*\n");
  write("scripts/example-bundles.json", [{ package: "bundle-new" }]);
  write("examples/bundle-new/package.json", {
    name: "bundle-new",
    dependencies: { bridge: "workspace:*" },
  });
  write("examples/bundle-shared/package.json", { name: "bundle-shared" });
  write("packages/ui/package.json", { name: "@assistant-ui/ui" });
  write("packages/x-buildutils/package.json", {
    name: "@assistant-ui/x-buildutils",
  });
  write("packages/bridge/package.json", {
    name: "bridge",
    peerDependencies: { runtime: "^1.0.0" },
    devDependencies: { compiler: "workspace:*" },
    optionalDependencies: { optional: "workspace:*" },
  });
  write("packages/runtime/package.json", {
    name: "runtime",
    dependencies: { bridge: "workspace:*" },
  });
  write("packages/compiler/package.json", { name: "compiler" });
  write("packages/optional/package.json", { name: "optional" });
  write("packages/unrelated/package.json", { name: "unrelated" });
  return { root, write };
}

test("new bundles follow transitive workspace dependencies, including peers and build tools", (t) => {
  const { root } = bundleFixture(t);
  for (const file of [
    "examples/bundle-new/src/main.tsx",
    "packages/runtime/src/index.ts",
    "packages/compiler/src/index.ts",
    "packages/optional/src/index.ts",
  ]) {
    assert.equal(hasExampleBundleInputs([file], root), true, file);
  }
  assert.equal(
    hasExampleBundleInputs(["packages/unrelated/src/index.ts"], root),
    false,
  );
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
  assert.match(
    detector,
    /BASE=\$\(node scripts\/prepare-ci-base\.mjs --resolve\)/,
  );
  assert.match(detector, /CI_BEFORE: \$\{\{ github\.event\.before \}\}/);
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
  ]) {
    assert.match(
      step(name),
      /steps\.app_build_inputs\.outputs\.run == 'true'/,
      name,
    );
  }

  for (const name of ["Setup pnpm and node.js", "Install dependencies"]) {
    assert.match(
      step(name),
      /steps\.app_build_inputs\.outputs\.bundles == 'true'/,
    );
  }
  assert.match(
    step("Verify standalone example bundle contracts"),
    /if: steps\.app_build_inputs\.outputs\.bundles == 'true'/,
  );
  assert.doesNotMatch(
    step("Verify standalone example bundle contracts"),
    /outputs\.run/,
  );

  assert.doesNotMatch(
    step("Test app build input detector"),
    /steps\.app_build_inputs\.outputs\.run/,
  );
});

test("the workflow emits independent app and bundle decisions and keeps an unknown base enabled", (t) => {
  const { root, write } = bundleFixture(t);
  for (const file of ["app-build-inputs.mjs", "prepare-ci-base.mjs", "lib"]) {
    cpSync(
      path.join(repoRoot, "scripts", file),
      path.join(root, "scripts", file),
      { recursive: true },
    );
  }
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git("init", "--quiet");
  git("config", "user.name", "CI test");
  git("config", "user.email", "ci-test@example.invalid");
  git("add", ".");
  git("commit", "--quiet", "-m", "base");
  const base = git("rev-parse", "HEAD");
  write("packages/unrelated/src/index.ts", "export const value = 1;");
  git("add", ".");
  git("commit", "--quiet", "-m", "unrelated source");
  const run = step("Detect app build inputs")
    .split("        run: |\n")[1]
    .split("\n")
    .map((line) => line.replace(/^          /, ""))
    .join("\n");
  const output = path.join(root, "output");
  const detect = (comparisonBase) => {
    writeFileSync(output, "");
    execFileSync("bash", ["-c", run], {
      cwd: root,
      env: {
        ...process.env,
        CI_EVENT_NAME: "merge_group",
        CI_MERGE_GROUP_BASE: comparisonBase,
        GITHUB_OUTPUT: output,
        RUNNER_TEMP: root,
      },
    });
    return Object.fromEntries(
      readFileSync(output, "utf8")
        .trim()
        .split("\n")
        .map((line) => line.split("=")),
    );
  };
  assert.deepEqual(detect(base), { run: "true", bundles: "false", base });
  assert.deepEqual(detect("missing"), {
    run: "true",
    bundles: "true",
    base: "missing",
  });
  write("packages/runtime/src/index.ts", "export const value = 2;");
  git("add", "packages/runtime/src/index.ts");
  git("commit", "--quiet", "-m", "shared runtime");
  assert.deepEqual(detect(base), { run: "true", bundles: "true", base });
});
