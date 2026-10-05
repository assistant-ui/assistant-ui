import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseWorkspaceGlobs } from "./check-changesets.mjs";
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

test("the workflow runs for detector changes", () => {
  for (const file of [
    "scripts/package-build-inputs.mjs",
    "scripts/package-build-inputs.test.mjs",
  ]) {
    assert.equal(
      workflow.match(new RegExp(`      - "${file}"`, "g"))?.length,
      2,
      file,
    );
  }
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
  const detector = step("Detect package build inputs");
  assert.match(detector, /node scripts\/package-build-inputs\.mjs/);
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
    "Build packages",
    "Check API surface",
    "Check distribution barrels",
    "Check built declarations",
    "Test built declaration checker",
    "Test the distribution barrel checker",
    "Test the deploy examples planner",
    "Test API surface generator",
    "Test API reference input detector",
    "Measure bundle sizes against the base",
  ]) {
    assert.match(
      step(name),
      /steps\.package_build_inputs\.outputs\.run == 'true'/,
      name,
    );
  }

  assert.doesNotMatch(
    step("Test package build input detector"),
    /steps\.package_build_inputs\.outputs\.run/,
  );
  assert.doesNotMatch(
    step("Post the size report as a sticky PR comment"),
    /steps\.package_build_inputs\.outputs\.run/,
  );
});

test("the build install follows the affected package graph", () => {
  assert.match(step("Setup pnpm and node.js"), /cache: false/);
  const install = step("Install dependencies");
  for (const name of [
    "Install dependencies",
    "Build packages",
    "Check API surface",
  ]) {
    assert.match(
      step(name),
      /BASE: \$\{\{ steps\.package_build_inputs\.outputs\.base \}\}/,
    );
  }
  assert.match(step("Detect package build inputs"), /echo "base=\$BASE"/);
  assert.match(step("Detect package build inputs"), /run=true\n\s+BASE=""/);
  const guardedInstall = install.match(
    /if \[ -n "\$BASE" \] && git diff --quiet "\$BASE" HEAD -- \\\n(?<inputs>[\s\S]*?); then\n(?<filteredInstall>[\s\S]*?)\n\s+else/,
  );
  assert.ok(guardedInstall?.groups);
  for (const input of [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
    "packages/x-buildutils",
  ]) {
    assert.ok(guardedInstall.groups.inputs.includes(input), input);
  }
  assert.match(
    guardedInstall.groups.filteredInstall,
    /pnpm install --frozen-lockfile \\/,
  );
  for (const filter of [
    ".",
    "@assistant-ui/api-surface",
    "@assistant-ui/react-devtools...",
    "@assistant-ui/x-buildutils...",
    "@assistant-ui/x-performance",
    "!./apps/*",
    "!./examples/*",
    "!./templates/*",
  ]) {
    assert.ok(
      guardedInstall.groups.filteredInstall.includes(`--filter="${filter}"`),
      filter,
    );
  }
  assert.match(guardedInstall.groups.filteredInstall, /\$\{filters\[@\]\}/);
  assert.match(
    install,
    /node scripts\/update-api-surface\.mjs --base "\$BASE" --print-filters/,
  );
  assert.match(install, /--filter=\.\/packages\/\*\.\.\./);
  assert.match(
    step("Build packages"),
    /pnpm api-surface -- --base=.* --build-only/,
  );
  assert.match(step("Check API surface"), /--skip-build --base=/);
  assert.match(install, /else\n\s+pnpm install --frozen-lockfile\n\s+fi/);
});

test("test and typecheck installs exclude API snapshots without weakening the build check", () => {
  for (const job of ["test", "typecheck"]) {
    const content = workflow.match(
      new RegExp(`\\n  ${job}:\\n[\\s\\S]*?(?=\\n  [a-z-]+:|$)`),
    )?.[0];
    assert.ok(content, job);
    const install = content.match(
      /      - name: Install dependencies\n[\s\S]*?(?=\n      - name:)/,
    )?.[0];
    assert.ok(install, job);
    assert.match(install, /--filter="!@assistant-ui\/api-surface"/);
    assert.match(install, /--filter="\.\.\.\[\$BASE\]\.\.\."/);
    assert.match(install, /--filter="@assistant-ui\/react-devtools\.\.\."/);
    assert.match(install, /else\n\s+pnpm install --frozen-lockfile\n\s+fi/);
  }
  assert.doesNotMatch(
    step("Install dependencies"),
    /!@assistant-ui\/api-surface/,
  );
  assert.match(step("Check API surface"), /api-surface:check/);
});

test("the excluded snapshot workspace has no build, test, typecheck, or workspace consumers", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(repoRoot, "api-surface/package.json"), "utf8"),
  );
  for (const task of ["build", "test", "typecheck"]) {
    assert.equal(manifest.scripts[task], undefined, task);
  }
  const workspaceGlobs = parseWorkspaceGlobs(
    readFileSync(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8"),
  );
  const workspaceManifests = new Set([
    "package.json",
    ...workspaceGlobs.flatMap((glob) =>
      globSync(`${glob}/package.json`, { cwd: repoRoot }),
    ),
  ]);
  for (const workspaceManifest of workspaceManifests) {
    const pkg = JSON.parse(
      readFileSync(path.join(repoRoot, workspaceManifest), "utf8"),
    );
    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ]) {
      assert.equal(
        pkg[field]?.[manifest.name],
        undefined,
        `${workspaceManifest}: ${field}`,
      );
    }
  }
});
