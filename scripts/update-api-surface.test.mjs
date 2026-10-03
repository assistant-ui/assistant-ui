import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FULL_API_SURFACE_INPUTS,
  apiSurfaceCommands,
  filtersForApiSurfaceChanges,
  requiresFullApiSurface,
} from "./update-api-surface.mjs";

test("shared generator and build inputs require every API surface", () => {
  for (const file of [
    "api-surface/assistant-ui__react.ts",
    "packages/x-buildutils/src/index.ts",
    "scripts/generate-api-surface.mjs",
    "scripts/autofix-install.mjs",
    "scripts/update-api-surface.mjs",
    "scripts/lib/changed-files.mjs",
    "scripts/lib/workspace.mjs",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
    ".github/workflows/autofix.yaml",
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

test("an affected run applies the same filters to build and generation", () => {
  assert.deepEqual(apiSurfaceCommands(["...[origin/main]"]), [
    [
      "pnpm",
      [
        "exec",
        "turbo",
        "build",
        "--filter",
        "...[origin/main]",
        "--filter=!./apps/*",
        "--filter=!./examples/*",
        "--filter=!./templates/*",
      ],
    ],
    [
      "node",
      ["scripts/generate-api-surface.mjs", "--filter", "...[origin/main]"],
    ],
  ]);
});

test("the planner watches its own implementation", () => {
  assert.ok(FULL_API_SURFACE_INPUTS.includes("scripts/update-api-surface.mjs"));
});
