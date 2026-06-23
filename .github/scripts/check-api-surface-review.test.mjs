import test from "node:test";
import assert from "node:assert/strict";
import {
  collectPublicApiMatchers,
  derivePublicApiMatchers,
  findApiSurfaceChanges,
  flattenExportTargets,
  listPackageJsonsFromTree,
} from "./check-api-surface-review.mjs";

test("listPackageJsonsFromTree keeps package manifests only", () => {
  const result = listPackageJsonsFromTree(
    [
      "packages/react/package.json",
      "packages/react/src/index.ts",
      "apps/docs/package.json",
      "packages/core/package.json",
      "",
    ].join("\n"),
  );

  assert.deepEqual(result, [
    "packages/core/package.json",
    "packages/react/package.json",
  ]);
});

test("flattenExportTargets collects nested condition targets", () => {
  const targets = flattenExportTargets({
    ".": {
      types: "./dist/index.d.ts",
      default: "./dist/index.js",
    },
    "./loader": {
      default: "./dist/loader.js",
    },
  });

  assert.deepEqual(targets, [
    "./dist/index.d.ts",
    "./dist/index.js",
    "./dist/loader.js",
  ]);
});

test("derivePublicApiMatchers resolves files and wildcard directories", () => {
  const exists = (candidate) =>
    [
      "packages/react/src/index.ts",
      "packages/next/src/index.ts",
      "packages/next/src/loader.ts",
    ].includes(candidate);

  const reactMatchers = derivePublicApiMatchers(
    "packages/react/package.json",
    {
      name: "@assistant-ui/react",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          default: "./dist/index.js",
        },
      },
    },
    { exists },
  );
  assert.deepEqual(reactMatchers.files, [
    "packages/react/package.json",
    "packages/react/src/index.ts",
  ]);

  const uiMatchers = derivePublicApiMatchers(
    "packages/ui/package.json",
    {
      name: "@assistant-ui/ui",
      exports: {
        "./components/ui/*": "./src/components/ui/*",
      },
    },
    { exists: () => false },
  );
  assert.deepEqual(uiMatchers.directories, ["packages/ui/src/components/ui/"]);
});

test("findApiSurfaceChanges matches files and wildcard directories", () => {
  const changes = findApiSurfaceChanges(
    [
      "packages/react/src/index.ts",
      "packages/ui/src/components/ui/button.tsx",
      "packages/core/src/runtime/internal.ts",
    ],
    {
      files: ["packages/react/src/index.ts"],
      directories: ["packages/ui/src/components/ui/"],
    },
  );

  assert.deepEqual(changes, [
    "packages/react/src/index.ts",
    "packages/ui/src/components/ui/button.tsx",
  ]);
});

test("collectPublicApiMatchers merges package-level matchers", () => {
  const packageJsonLoader = (relativePath) => {
    if (relativePath === "packages/react/package.json") {
      return {
        name: "@assistant-ui/react",
        exports: { ".": { default: "./dist/index.js" } },
      };
    }
    if (relativePath === "packages/ui/package.json") {
      return {
        name: "@assistant-ui/ui",
        exports: { "./components/ui/*": "./src/components/ui/*" },
      };
    }
    return null;
  };
  const fileExists = (candidate) => candidate === "packages/react/src/index.ts";
  const matchers = collectPublicApiMatchers(
    ["packages/react/package.json", "packages/ui/package.json"],
    packageJsonLoader,
    fileExists,
  );

  assert.deepEqual(matchers.files, [
    "packages/react/package.json",
    "packages/react/src/index.ts",
    "packages/ui/package.json",
  ]);
  assert.deepEqual(matchers.directories, ["packages/ui/src/components/ui/"]);
});
