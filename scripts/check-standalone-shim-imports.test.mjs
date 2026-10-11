import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  missingShimImports,
  namedExports,
  namedImports,
  routesReactToShim,
  runCheck,
} from "./check-standalone-shim-imports.mjs";

const root = path.resolve(import.meta.dirname, "..");

function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "aui-shim-check-"));
  const put = (file, text) => {
    const target = path.join(dir, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  };
  put(
    "packages/tap/package.json",
    JSON.stringify({
      name: "@assistant-ui/tap",
      peerDependencies: { react: "^19" },
    }),
  );
  put(
    "packages/tap/dist/standalone-shim/index.js",
    "const useState = () => {}; export { useState };\n",
  );
  put("packages/tap/dist/index.js", "export const tap = 1;\n");
  put(
    "packages/core/package.json",
    JSON.stringify({
      name: "@assistant-ui/core",
      peerDependencies: { react: "^19", "@assistant-ui/tap": "*" },
    }),
  );
  put(
    "packages/core/dist/index.js",
    'import { useState as state } from "react";\n',
  );
  put(
    "packages/svelte/package.json",
    JSON.stringify({
      name: "@assistant-ui/svelte",
      dependencies: { "@assistant-ui/core": "*", "@assistant-ui/tap": "*" },
    }),
  );
  put(
    "packages/react/package.json",
    JSON.stringify({
      name: "@assistant-ui/react",
      peerDependencies: { react: "^19", "@assistant-ui/tap": "*" },
    }),
  );
  put(
    "packages/react/dist/index.js",
    'import { Component } from "@assistant-ui/tap/react-shim";\n',
  );
  return { dir, put };
}

test("parses named imports and standalone exports without confusing aliases or text", () => {
  const exports = namedExports(
    "const useState = 1; export { useState as state }; export const useRef = 2;",
  );
  assert.deepEqual([...exports], ["state", "useRef"]);
  assert.deepEqual(
    namedImports(
      'const text = "import { version } from react"; import React, { useState as state } from "react"; import { useRef } from "@assistant-ui/tap/react-shim"; import { ignored } from "react/jsx-runtime";',
    ),
    ["useState", "useRef"],
  );
  assert.deepEqual(
    missingShimImports(
      "fixture.js",
      'import { state, version as v } from "react";',
      exports,
    ),
    [{ file: "fixture.js", name: "version" }],
  );
  assert.deepEqual(
    missingShimImports(
      "fixture.js",
      'export { notInShim } from "react"; export { other as alias } from "@assistant-ui/tap/react-shim";',
      exports,
    ),
    [
      { file: "fixture.js", name: "notInShim" },
      { file: "fixture.js", name: "other" },
    ],
  );
});

test("uses the build alias rule", () => {
  assert.equal(routesReactToShim({ name: "@assistant-ui/tap" }), true);
  assert.equal(
    routesReactToShim({
      peerDependencies: { react: "*", "@assistant-ui/tap": "*" },
    }),
    true,
  );
  assert.equal(
    routesReactToShim({ dependencies: { "@assistant-ui/tap": "*" } }),
    true,
  );
});

test("reports missing names in Reactless consumer dists", (t) => {
  const { dir, put } = fixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  put(
    "packages/svelte/dist/index.js",
    'import { absent } from "@assistant-ui/tap/standalone-shim";\n',
  );
  assert.deepEqual(runCheck(dir).failures, [
    { file: "packages/svelte/dist/index.js", name: "absent" },
  ]);
});

test("checks dists reachable from Reactless consumers and catches version", (t) => {
  const { dir, put } = fixture();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.deepEqual(runCheck(dir).failures, []);
  put(
    "packages/core/dist/index.js",
    'import { version } from "@assistant-ui/tap/react-shim";\n',
  );
  assert.deepEqual(runCheck(dir).failures, [
    { file: "packages/core/dist/index.js", name: "version" },
  ]);
  const failed = spawnSync(
    process.execPath,
    [path.join(root, "scripts/check-standalone-shim-imports.mjs"), dir],
    { encoding: "utf8" },
  );
  assert.equal(failed.status, 1);
  assert.match(
    failed.stderr,
    /packages\/core\/dist\/index\.js: named import version/,
  );
  rmSync(path.join(dir, "packages/core/dist"), { recursive: true });
  assert.deepEqual(runCheck(dir).failures, []);
  const passed = spawnSync(
    process.execPath,
    [path.join(root, "scripts/check-standalone-shim-imports.mjs"), dir],
    { encoding: "utf8" },
  );
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(passed.stdout, /skipped unbuilt: @assistant-ui\/core/);
});

test(
  "executable exits successfully on the built repository",
  {
    skip:
      !existsSync(
        path.join(root, "packages/tap/dist/standalone-shim/index.js"),
      ) && "tap is not built",
  },
  () => {
    const ok = spawnSync(
      process.execPath,
      [path.join(root, "scripts/check-standalone-shim-imports.mjs")],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /imports resolve/);
  },
);
