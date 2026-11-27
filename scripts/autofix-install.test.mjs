import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { autofixInstallArgs } from "./autofix-install.mjs";

const installArgs = ["install", "--frozen-lockfile", "--ignore-scripts"];

test("shared API surface inputs keep the full install fallback", () => {
  for (const file of [
    "api-surface/unknown-package.ts",
    "api-surface/tsconfig.json",
    "pnpm-lock.yaml",
  ]) {
    assert.deepEqual(
      autofixInstallArgs(["api-surface/assistant-ui__core.ts", file], "HEAD"),
      installArgs,
      file,
    );
  }
});

test("standalone snapshots install their owners and workspace dependencies", () => {
  for (const owners of [["core"], ["core", "react"]]) {
    const files = owners.map(
      (owner) => `api-surface/assistant-ui__${owner}.ts`,
    );
    assert.deepEqual(autofixInstallArgs(files, "HEAD"), [
      ...installArgs,
      "--filter={.}...",
      "--filter=@assistant-ui/x-buildutils...",
      "--filter=...[HEAD]...",
      ...owners.map((owner) => `--filter=@assistant-ui/${owner}...`),
      "--filter=!./apps/*",
      "--filter=!./examples/*",
      "--filter=!./templates/*",
    ]);
  }
});

test("package changes install only the dependencies autofix executes", () => {
  assert.deepEqual(
    autofixInstallArgs(["packages/react/src/index.ts"], "origin/main"),
    [
      ...installArgs,
      "--filter={.}...",
      "--filter=@assistant-ui/x-buildutils...",
      "--filter=...[origin/main]...",
      "--filter=!./apps/*",
      "--filter=!./examples/*",
      "--filter=!./templates/*",
    ],
  );
});

test("unrelated changes still install the root autofix tools", () => {
  assert.deepEqual(autofixInstallArgs(["README.md"], "origin/main"), [
    ...installArgs,
    "--filter={.}...",
    "--filter=@assistant-ui/x-buildutils...",
    "--filter=...[origin/main]...",
    "--filter=!./apps/*",
    "--filter=!./examples/*",
    "--filter=!./templates/*",
  ]);
});

test("the autofix workflow uses the shared install planner", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/autofix.yaml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /node scripts\/autofix-install\.mjs --base=/);
});
