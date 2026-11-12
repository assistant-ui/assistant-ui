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
  hasPackageInputs,
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
    "scripts/ci-has-tasks.mjs",
    "scripts/ci-has-tasks.test.mjs",
    "apps/docs/content/docs/index.mdx",
    "scripts/lib/script-options.mjs",
    "scripts/lib/package-test-inputs.mjs",
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
    assert.equal(hasPackageInputs([file]), false, file);
  }
  assert.equal(hasAppBuildInputs([]), false);
  assert.equal(hasPackageInputs([]), false);
});

test("leaves package changes to Turbo's planner", () => {
  for (const file of [
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
    "packages/x-changelog/index.mjs",
  ]) {
    assert.equal(hasAppBuildInputs([file]), false, file);
    assert.equal(hasPackageInputs([file]), true, file);
  }
});

test("keeps real build inputs in mixed package-test changes", () => {
  const packageTest = "packages/cloud/src/telemetry/index.test.ts";
  for (const [detect, input] of [
    [hasPackageInputs, "packages/cloud/src/telemetry/index.ts"],
    [hasPackageInputs, "packages/ui/src/components/react/thread.test.tsx"],
    [hasAppBuildInputs, "pnpm-lock.yaml"],
  ]) {
    assert.equal(detect([packageTest, input]), true, input);
    assert.equal(detect([input, packageTest]), true, input);
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

  const packageChange = "README.md\0packages/react-ag-ui/src/index.ts\0";
  for (const [args, stdout] of [
    [[], "false\n"],
    [["--packages"], "true\n"],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      input: packageChange,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, stdout, args.join(" "));
  }
});

function ciFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-app-inputs-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(
      path.join(root, file),
      typeof value === "string" ? value : JSON.stringify(value),
    );
  };
  write("pnpm-workspace.yaml", "packages:\n  - packages/*\n");
  write("packages/unrelated/package.json", { name: "unrelated" });
  return { root, write };
}

test("the detector watches its own implementation", () => {
  for (const file of [
    "scripts/app-build-inputs.mjs",
    "scripts/app-build-inputs.test.mjs",
    "scripts/ci-has-tasks.mjs",
    "scripts/ci-has-tasks.test.mjs",
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
  assert.doesNotMatch(
    step("Setup pnpm for app build planning"),
    /\n        if:/,
  );
  assert.ok(
    buildAppsJob[0].indexOf("- name: Setup pnpm for app build planning") <
      buildAppsJob[0].indexOf("- name: Detect app build inputs"),
  );
  assert.doesNotMatch(
    step("Test app build input detector"),
    /steps\.app_build_inputs\.outputs\.run/,
  );
});

test("the planner asks Turbo with the Build apps commands", () => {
  const planned = [
    ...step("Detect app build inputs").matchAll(
      /node scripts\/ci-has-tasks\.mjs --plan build (.+)\) \|\| run=true$/gm,
    ),
  ].map(([, filters]) => filters);
  const built = [
    ...step("Build apps").matchAll(/pnpm turbo build (.+)$/gm),
  ].map(([, filters]) => filters);
  assert.equal(built.length, 2);
  assert.deepEqual(planned, built);
});

test("the app build installs without the pnpm store cache", () => {
  assert.match(step("Setup pnpm and node.js"), /cache: false/);
});

test("the workflow plans package changes and keeps an unknown base enabled", (t) => {
  const { root, write } = ciFixture(t);
  for (const file of ["app-build-inputs.mjs", "prepare-ci-base.mjs", "lib"]) {
    cpSync(
      path.join(repoRoot, "scripts", file),
      path.join(root, "scripts", file),
      { recursive: true },
    );
  }
  const calls = path.join(root, "planner-calls");
  write(
    "scripts/ci-has-tasks.mjs",
    `import { appendFileSync, readFileSync } from "node:fs";
appendFileSync(process.env.PLANNER_CALLS, JSON.stringify(process.argv.slice(2)) + "\\n");
const count = readFileSync(process.env.PLANNER_CALLS, "utf8").trim().split("\\n").length;
const answer = process.env.PLANNER_ANSWERS.split(",")[count - 1];
if (answer === "error") process.exit(1);
console.log(answer);
`,
  );
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
  const detect = (comparisonBase, answers = "") => {
    writeFileSync(output, "");
    writeFileSync(calls, "");
    execFileSync("bash", ["-c", run], {
      cwd: root,
      env: {
        ...process.env,
        CI_EVENT_NAME: "merge_group",
        CI_MERGE_GROUP_BASE: comparisonBase,
        GITHUB_OUTPUT: output,
        RUNNER_TEMP: root,
        PLANNER_CALLS: calls,
        PLANNER_ANSWERS: answers,
      },
    });
    return {
      outputs: Object.fromEntries(
        readFileSync(output, "utf8")
          .trim()
          .split("\n")
          .map((line) => line.split("=")),
      ),
      calls: readFileSync(calls, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
    };
  };
  const apps = [
    "--plan",
    "build",
    `--filter=...[${base}]`,
    "--filter=!./packages/*",
    "--filter=!./api-surface",
    "--filter=!@assistant-ui/docs-site",
    "--filter=!./examples/*",
  ];
  const examples = ["--plan", "build", `--filter={./examples/*}[${base}]`];

  assert.deepEqual(detect(base, "false,false"), {
    outputs: { run: "false", base },
    calls: [apps, examples],
  });
  const appsPlanned = detect(base, "true");
  assert.equal(appsPlanned.outputs.run, "true");
  assert.deepEqual(appsPlanned.calls, [apps]);
  assert.deepEqual(detect(base, "false,true"), {
    outputs: { run: "true", base },
    calls: [apps, examples],
  });
  assert.deepEqual(detect(base, "error"), {
    outputs: { run: "true", base },
    calls: [apps],
  });
  assert.deepEqual(detect(base, "false,error"), {
    outputs: { run: "true", base },
    calls: [apps, examples],
  });
  assert.deepEqual(detect("missing"), {
    outputs: { run: "true", base: "missing" },
    calls: [],
  });

  write("templates/starter/app/page.tsx", "export default null;");
  git("add", "templates/starter/app/page.tsx");
  git("commit", "--quiet", "-m", "template");
  assert.deepEqual(detect(base), {
    outputs: { run: "true", base },
    calls: [],
  });
});
