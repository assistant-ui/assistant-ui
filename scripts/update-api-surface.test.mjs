import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  FULL_API_SURFACE_INPUTS,
  apiSurfaceCommands,
  filtersForApiSurfaceChanges,
  requiresFullApiSurface,
  resolveApiSurfaceFilters,
} from "./update-api-surface.mjs";

test("shared generator and build inputs require every API surface", () => {
  for (const file of [
    "api-surface/assistant-ui__react.ts",
    "packages/x-buildutils/src/index.ts",
    "scripts/generate-api-surface.mjs",
    "scripts/autofix-install.mjs",
    "scripts/update-api-surface.mjs",
    "scripts/lib/changed-files.mjs",
    "scripts/check-api-surface.mjs",
    "scripts/lib/workspace.mjs",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
    ".github/workflows/autofix.yaml",
    ".github/workflows/code-quality.yaml",
  ]) {
    assert.equal(requiresFullApiSurface([file]), true, file);
    assert.deepEqual(filtersForApiSurfaceChanges([file], "origin/main"), []);
  }
});

test("package changes use the affected package graph", () => {
  assert.equal(requiresFullApiSurface(["packages/react/src/index.ts"]), false);
  assert.deepEqual(
    filtersForApiSurfaceChanges(["packages/react/src/index.ts"], "origin/main"),
    ["...[origin/main]"],
  );
  assert.deepEqual(filtersForApiSurfaceChanges([], "origin/main"), [
    "...[origin/main]",
  ]);
});

test("a known snapshot selects its owner alongside the affected source graph", () => {
  const files = [
    "api-surface/assistant-ui__react-google-adk.ts",
    "packages/react-google-adk/src/AdkClient.ts",
  ];
  const packages = ["@assistant-ui/react", "@assistant-ui/react-google-adk"];
  assert.equal(requiresFullApiSurface(files, packages), false);
  assert.deepEqual(
    filtersForApiSurfaceChanges(files, "origin/main", packages),
    ["...[origin/main]", "@assistant-ui/react-google-adk"],
  );
});

test("snapshot-only edits and deletions still select their current owners", () => {
  assert.deepEqual(
    filtersForApiSurfaceChanges(
      ["api-surface/assistant-ui__react.ts"],
      "origin/main",
      ["@assistant-ui/react"],
    ),
    ["...[origin/main]", "@assistant-ui/react"],
  );
});

test("multiple snapshots select scoped and unscoped owners deterministically", () => {
  assert.deepEqual(
    filtersForApiSurfaceChanges(
      [
        "api-surface/assistant-ui.ts",
        "api-surface/assistant-ui__react.ts",
        "api-surface/assistant-ui.ts",
      ],
      "origin/main",
      ["assistant-ui", "@assistant-ui/react", "create-assistant-ui"],
    ),
    ["...[origin/main]", "@assistant-ui/react", "assistant-ui"],
  );
});

test("unknown snapshots and shared inputs retain the full fallback", () => {
  for (const extraFile of [
    "api-surface/removed-package.ts",
    "api-surface/package.json",
    "api-surface/tsconfig.json",
    "api-surface/nested/assistant-ui__react.ts",
    "pnpm-lock.yaml",
    "packages/x-buildutils/src/index.ts",
  ]) {
    const files = ["api-surface/assistant-ui__react.ts", extraFile];
    assert.equal(requiresFullApiSurface(files, ["@assistant-ui/react"]), true);
    assert.deepEqual(
      filtersForApiSurfaceChanges(files, "origin/main", [
        "@assistant-ui/react",
      ]),
      [],
      extraFile,
    );
  }
});

test("snapshots for renamed, removed, or now-private packages require a full run", () => {
  assert.deepEqual(
    filtersForApiSurfaceChanges(
      ["api-surface/assistant-ui__old-name.ts"],
      "origin/main",
      ["@assistant-ui/new-name"],
    ),
    [],
  );
});

test("similarly prefixed packages do not trigger the shared-input fallback", () => {
  assert.equal(
    requiresFullApiSurface(["packages/x-buildutils-extra/src/index.ts"]),
    false,
  );
});

test("a full run builds and generates every publishable package", () => {
  assert.deepEqual(apiSurfaceCommands([]), [
    ["pnpm", ["exec", "turbo", "build", "--filter=./packages/*"]],
    ["node", ["scripts/generate-api-surface.mjs"]],
  ]);
});

test("an affected run applies the source and snapshot filters to build and generation", () => {
  assert.deepEqual(
    apiSurfaceCommands(["...[origin/main]", "@assistant-ui/react"]),
    [
      [
        "pnpm",
        [
          "exec",
          "turbo",
          "build",
          "--filter",
          "...[origin/main]",
          "--filter",
          "@assistant-ui/react",
          "--filter=!./apps/*",
          "--filter=!./examples/*",
          "--filter=!./templates/*",
        ],
      ],
      [
        "node",
        [
          "scripts/generate-api-surface.mjs",
          "--filter",
          "...[origin/main]",
          "--filter",
          "@assistant-ui/react",
        ],
      ],
    ],
  );
});

test("the CLI derives snapshot owners from current publishable manifests", () => {
  const repo = mkdtempSync(path.join(tmpdir(), "api-surface-planner-"));
  const run = (command, args, options = {}) => {
    const result = spawnSync(command, args, {
      cwd: repo,
      encoding: "utf8",
      ...options,
    });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    return result.stdout;
  };
  try {
    mkdirSync(path.join(repo, "scripts/lib"), { recursive: true });
    for (const file of [
      "update-api-surface.mjs",
      "check-api-surface.mjs",
      "lib/workspace.mjs",
      "lib/script-options.mjs",
      "lib/changed-files.mjs",
      "lib/main.mjs",
    ]) {
      cpSync(new URL(file, import.meta.url), path.join(repo, "scripts", file));
    }
    const recorder = `console.log(JSON.stringify(process.argv.slice(2)));\n`;
    writeFileSync(
      path.join(repo, "scripts/generate-api-surface.mjs"),
      `console.log(JSON.stringify([${JSON.stringify(path.join("scripts", "generate-api-surface.mjs"))}, ...process.argv.slice(2)]));\n`,
    );
    mkdirSync(path.join(repo, "bin"));
    writeFileSync(
      path.join(repo, "bin/pnpm"),
      `#!${process.execPath}\n${recorder}`,
      { mode: 0o755 },
    );
    for (const [dir, pkg] of Object.entries({
      public: { name: "@assistant-ui/public" },
      private: { name: "@assistant-ui/private", private: true },
    })) {
      mkdirSync(path.join(repo, "packages", dir), { recursive: true });
      writeFileSync(
        path.join(repo, "packages", dir, "package.json"),
        JSON.stringify(pkg),
      );
    }
    mkdirSync(path.join(repo, "api-surface"));
    const snapshot = path.join(repo, "api-surface/assistant-ui__public.ts");
    writeFileSync(snapshot, "export {};\n");
    run("git", ["init", "-q"]);
    run("git", ["add", "."]);
    run("git", [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-qm",
      "fixture",
    ]);
    const invoke = (script, args = []) =>
      run(process.execPath, [`scripts/${script}`, "--base=HEAD", ...args], {
        env: {
          ...process.env,
          PATH: `${path.join(repo, "bin")}${path.delimiter}${process.env.PATH}`,
        },
      });
    const plan = (args = []) =>
      invoke("update-api-surface.mjs", args)
        .trim()
        .split("\n")
        .slice(1)
        .map((line) => JSON.parse(line));
    const checkPlan = () =>
      invoke("check-api-surface.mjs", ["--skip-build"])
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
    const expectedCheck = [
      [
        "scripts/generate-api-surface.mjs",
        "--check",
        "--filter",
        "...[HEAD]",
        "--filter",
        "@assistant-ui/public",
      ],
      ["--filter", "@assistant-ui/api-surface", "check"],
    ];

    writeFileSync(snapshot, "export const changed: true;\n");
    assert.deepEqual(checkPlan(), expectedCheck);
    assert.deepEqual(
      JSON.parse(invoke("update-api-surface.mjs", ["--print-filters"])),
      ["...[HEAD]", "@assistant-ui/public"],
    );
    assert.deepEqual(plan(["--build-only"]), [
      apiSurfaceCommands(["...[HEAD]", "@assistant-ui/public"])[0][1],
    ]);
    assert.deepEqual(
      plan(),
      apiSurfaceCommands(["...[HEAD]", "@assistant-ui/public"]).map(
        ([, args]) => args,
      ),
    );
    const commit = (message) =>
      run("git", [
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "commit",
        "-qm",
        message,
      ]);
    run("git", ["add", "api-surface"]);
    commit("snapshot change");
    writeFileSync(path.join(repo, "README.md"), "unrelated second commit\n");
    run("git", ["add", "README.md"]);
    commit("readme change");
    const multiCommit = run(
      process.execPath,
      ["scripts/check-api-surface.mjs", "--skip-build", "--base=HEAD~2"],
      {
        env: {
          ...process.env,
          PATH: `${path.join(repo, "bin")}${path.delimiter}${process.env.PATH}`,
        },
      },
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.deepEqual(multiCommit[0], [
      "scripts/generate-api-surface.mjs",
      "--check",
      "--filter",
      "...[HEAD~2]",
      "--filter",
      "@assistant-ui/public",
    ]);
    rmSync(snapshot);
    assert.deepEqual(checkPlan(), expectedCheck);
    assert.deepEqual(
      plan(),
      apiSurfaceCommands(["...[HEAD]", "@assistant-ui/public"]).map(
        ([, args]) => args,
      ),
    );

    writeFileSync(
      path.join(repo, "api-surface/assistant-ui__private.ts"),
      "export {};\n",
    );
    run("git", ["add", "api-surface"]);
    assert.deepEqual(checkPlan(), [
      ["scripts/generate-api-surface.mjs", "--check"],
      ["--filter", "@assistant-ui/api-surface", "check"],
    ]);
    assert.deepEqual(
      plan(),
      apiSurfaceCommands([]).map(([, args]) => args),
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("shared CLI selection preserves explicit filters and rejects ambiguous bases", () => {
  assert.deepEqual(resolveApiSurfaceFilters([]), []);
  assert.deepEqual(resolveApiSurfaceFilters(["--base="]), []);
  assert.deepEqual(
    resolveApiSurfaceFilters(["--", "--filter=one", "--filter", "two"]),
    ["one", "two"],
  );
  assert.throws(
    () => resolveApiSurfaceFilters(["--base=HEAD", "--base=main"]),
    /Only one --base/,
  );
  assert.throws(
    () => resolveApiSurfaceFilters(["--base=HEAD", "--filter=one"]),
    /either --base or --filter/,
  );
});

test("the planner watches its own implementation", () => {
  assert.ok(FULL_API_SURFACE_INPUTS.includes("scripts/update-api-surface.mjs"));
});
