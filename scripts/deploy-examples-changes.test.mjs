import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  WORKFLOW_FILE,
  allInputs,
  exampleInputs,
  planDeploys,
} from "./deploy-examples-changes.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const script = path.join(repoRoot, "scripts/deploy-examples-changes.mjs");

const examplesOf = (plan) => plan.matrix.include.map((entry) => entry.example);

test("each example's inputs follow its workspace dependency graph", () => {
  const expo = exampleInputs(repoRoot, "with-expo");
  for (const input of [
    "examples/with-expo",
    "packages/react-native",
    "packages/ui",
    "packages/metro",
    "packages/ai-sdk",
    "packages/core",
    "packages/store",
    "packages/tap",
    "packages/assistant-stream",
    "packages/x-generative-compiler",
    "packages/x-buildutils",
    "pnpm-lock.yaml",
    "scripts/deploy-examples-changes.mjs",
    WORKFLOW_FILE,
  ]) {
    assert.ok(expo.includes(input), `with-expo should watch ${input}`);
  }
  assert.ok(!expo.includes("packages/react-ink"));

  const ink = exampleInputs(repoRoot, "with-react-ink-web");
  for (const input of [
    "examples/with-react-ink-web",
    "examples/with-react-ink",
    "packages/react-ink",
    "packages/react-ink-markdown",
    "packages/core",
    "packages/tap",
  ]) {
    assert.ok(ink.includes(input), `with-react-ink-web should watch ${input}`);
  }
  for (const input of [
    "packages/react-native",
    "packages/ui",
    "packages/metro",
  ]) {
    assert.ok(
      !ink.includes(input),
      `with-react-ink-web should not watch ${input}`,
    );
  }
});

test("a change selects only the examples it feeds", () => {
  assert.deepEqual(
    examplesOf(
      planDeploys(repoRoot, [
        "examples/with-react-ink/src/components/thread-shell.tsx",
      ]),
    ),
    ["with-react-ink-web"],
  );
  assert.deepEqual(
    examplesOf(
      planDeploys(repoRoot, ["packages/ui/src/components/react-native/x.tsx"]),
    ),
    ["with-expo"],
  );
  assert.deepEqual(
    examplesOf(planDeploys(repoRoot, ["packages/react-ink/src/index.ts"])),
    ["with-react-ink-web"],
  );
  assert.deepEqual(
    examplesOf(planDeploys(repoRoot, ["packages/tap/src/index.ts"])),
    ["with-expo", "with-react-ink-web"],
  );
  assert.deepEqual(examplesOf(planDeploys(repoRoot, ["pnpm-lock.yaml"])), [
    "with-expo",
    "with-react-ink-web",
  ]);
  assert.deepEqual(
    examplesOf(
      planDeploys(repoRoot, ["packages/x-generative-compiler/src/x.ts"]),
    ),
    ["with-expo"],
  );
  assert.deepEqual(
    examplesOf(planDeploys(repoRoot, ["packages/uiwidgets/index.ts"])),
    [],
  );
  assert.deepEqual(planDeploys(repoRoot, ["apps/docs/content/x.mdx"]), {
    matrix: { include: [] },
    any: false,
  });
});

test("an unknown base deploys every example", () => {
  const plan = planDeploys(repoRoot, null);
  assert.deepEqual(examplesOf(plan), ["with-expo", "with-react-ink-web"]);
  assert.equal(
    plan.matrix.include[0]["chat-endpoint-url"],
    "https://www.assistant-ui.com/api/chat",
  );
  assert.equal(plan.any, true);
});

test("the CLI reads NUL separated paths and honours --all", () => {
  const piped = spawnSync(process.execPath, [script], {
    input: "examples/with-react-ink-web/app/page.tsx\0apps/docs/x.mdx\0",
    encoding: "utf8",
  });
  assert.equal(piped.status, 0, piped.stderr);
  assert.deepEqual(examplesOf(JSON.parse(piped.stdout)), [
    "with-react-ink-web",
  ]);

  const all = spawnSync(process.execPath, [script, "--all"], {
    encoding: "utf8",
  });
  assert.equal(all.status, 0, all.stderr);
  assert.deepEqual(examplesOf(JSON.parse(all.stdout)), [
    "with-expo",
    "with-react-ink-web",
  ]);
});

test("the workflow trigger paths are the union of the example inputs", () => {
  const workflow = readFileSync(path.join(repoRoot, WORKFLOW_FILE), "utf8");
  const block = workflow.match(/^    paths:\n((?:      - .*\n)+)/m);
  assert.ok(block, "paths block");
  const triggerPaths = block[1]
    .trim()
    .split("\n")
    .map((line) => line.replace(/^\s*- /, "").replace(/\/\*\*$/, ""))
    .sort();
  assert.deepEqual(triggerPaths, allInputs(repoRoot));
});

test("the Ink deployment uses the same scoped install inside and outside Vercel", () => {
  const root = JSON.parse(
    readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );
  const config = JSON.parse(
    readFileSync(
      path.join(repoRoot, "examples/with-react-ink-web/vercel.json"),
      "utf8",
    ),
  );
  assert.equal(
    config.installCommand,
    `pnpm install --frozen-lockfile --filter=${root.name} --filter=with-react-ink-web... --filter=@assistant-ui/react-devtools...`,
  );
  const workflow = readFileSync(path.join(repoRoot, WORKFLOW_FILE), "utf8");
  assert.match(
    workflow,
    /cache: \$\{\{ matrix.example != 'with-react-ink-web' \}\}/,
  );
  const install = workflow.match(
    /      - name: Install dependencies\n[\s\S]*?(?=\n      - name:)/,
  )?.[0];
  assert.ok(install);
  assert.match(
    install,
    /working-directory: examples\/\$\{\{ matrix.example \}\}/,
  );
  assert.match(install, /require\("\.\/vercel.json"\)\.installCommand/);
  assert.doesNotMatch(install, /run: pnpm install/);
});

test("the Ink install includes every explicitly built workspace", () => {
  const config = JSON.parse(
    readFileSync(
      path.join(repoRoot, "examples/with-react-ink-web/vercel.json"),
      "utf8",
    ),
  );
  const filters = (command) =>
    [...command.matchAll(/--filter=(\S+)/g)].map((match) => match[1]);
  const installed = spawnSync(
    "pnpm",
    [
      "list",
      "--depth=-1",
      "--json",
      ...filters(config.installCommand).map((filter) => `--filter=${filter}`),
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(installed.status, 0, installed.stderr);
  const names = new Set(JSON.parse(installed.stdout).map((pkg) => pkg.name));
  const builds = filters(config.buildCommand);
  assert.ok(builds.length > 0);
  for (const name of builds) {
    assert.ok(names.has(name), `${name} is built but not installed`);
  }
});

test("the Expo native bundle watches bundle inputs but skips isolated package tests", () => {
  const nativeWorkflowFile = ".github/workflows/expo-native-bundle.yaml";
  const workflow = readFileSync(
    path.join(repoRoot, nativeWorkflowFile),
    "utf8",
  );
  const pathBlocks = [
    ...workflow.matchAll(/^    paths:\n((?:      - .*\n)+)/gm),
  ].map((match) =>
    match[1]
      .trim()
      .split("\n")
      .map((line) => line.replace(/^\s*- /, "").replace(/^["']|["']$/g, "")),
  );
  const expectedPaths = [
    ...exampleInputs(repoRoot, "with-expo").filter(
      (input) => input !== WORKFLOW_FILE && !input.startsWith("scripts/"),
    ),
    nativeWorkflowFile,
    "packages/ui/src/components/react-native",
  ].sort();

  assert.equal(pathBlocks.length, 2, "pull request and push path filters");
  for (const patterns of pathBlocks) {
    const matches = (file) =>
      patterns.reduce((included, pattern) => {
        const negative = pattern.startsWith("!");
        return path.posix.matchesGlob(
          file,
          negative ? pattern.slice(1) : pattern,
        )
          ? !negative
          : included;
      }, false);

    assert.equal(
      matches(
        "packages/ui/src/components/react/assistant-ui/elements/agent-plan.test.tsx",
      ),
      false,
    );
    assert.equal(
      matches(
        "packages/ui/src/components/react-native/assistant-ui/thread.test.tsx",
      ),
      true,
    );
    assert.deepEqual(
      patterns
        .filter((pattern) => !pattern.startsWith("!"))
        .map((pattern) => pattern.replace(/\/\*\*$/, ""))
        .sort(),
      expectedPaths,
    );
    for (const input of expectedPaths) {
      if (!input.startsWith("packages/")) {
        assert.ok(
          matches(
            input.startsWith("examples/")
              ? `${input}/app/index.test.tsx`
              : input,
          ),
          input,
        );
        continue;
      }
      for (const file of [
        "src/index.ts",
        "src/nested/component.tsx",
        "src/index.spec.ts",
        "src/tests/helpers.ts",
        "package.json",
        "vitest.config.ts",
      ]) {
        assert.ok(matches(`${input}/${file}`), `${input}/${file}`);
      }
      // Native UI tests enter Tailwind's scan; CJS builds use the full tsconfig program.
      const packageRoot = input.split("/").slice(0, 2).join("/");
      const pkg = JSON.parse(
        readFileSync(path.join(repoRoot, packageRoot, "package.json"), "utf8"),
      );
      const testsAreInputs =
        input === "packages/ui/src/components/react-native" ||
        JSON.stringify(pkg.exports ?? {}).includes(".cjs");
      for (const file of [
        "src/index.test.ts",
        "src/nested/component.test.tsx",
      ]) {
        assert.equal(
          matches(`${input}/${file}`),
          testsAreInputs,
          `${input}/${file}`,
        );
      }
    }
  }
});

test("the Expo native bundle installs only its workspace graph", () => {
  const workflow = readFileSync(
    path.join(repoRoot, ".github/workflows/expo-native-bundle.yaml"),
    "utf8",
  );
  const setup = workflow.match(
    /      - name: Setup pnpm and node\.js\n[\s\S]*?(?=\n      - name:)/,
  );
  const install = workflow.match(
    /      - name: Install dependencies\n[\s\S]*?(?=\n      - name:)/,
  );

  assert.match(setup?.[0] ?? "", /cache: false/);
  assert.match(
    install?.[0] ?? "",
    /pnpm install --frozen-lockfile --filter \. --filter="@assistant-ui\/react-devtools\.\.\." --filter="with-expo\.\.\."/,
  );
});
