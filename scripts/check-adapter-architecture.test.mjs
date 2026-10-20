import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runCheck } from "./check-adapter-architecture.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const extrasImport =
  'import { createRuntimeExtras } from "@assistant-ui/core/react";\n';

function createWorkspace(files) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-adapter-architecture-"));
  writeFileSync(
    path.join(root, "pnpm-workspace.yaml"),
    "packages:\n  - packages/*\n",
  );
  const packages = new Set(
    Object.keys(files).map((file) => file.split("/")[1]),
  );
  for (const name of packages) {
    const packageDir = path.join(root, "packages", name);
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(
      path.join(packageDir, "package.json"),
      JSON.stringify({ name: `@fixture/${name}` }),
    );
  }
  for (const [file, source] of Object.entries(files)) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, source);
  }
  return root;
}

function withWorkspace(files, check) {
  const root = createWorkspace(files);
  try {
    check(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runExecutable(root) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "check-adapter-architecture.mjs")],
    {
      encoding: "utf8",
      env: { ...process.env, ADAPTER_ARCHITECTURE_CHECK_ROOT: root },
    },
  );
}

test("declared ThreadRuntimeCore state holders are reported but a core type import is allowed", () => {
  withWorkspace(
    {
      "packages/adapter/src/extras.ts": extrasImport,
      "packages/adapter/src/runtime.ts": [
        'import type { ThreadRuntimeCore } from "@assistant-ui/core";',
        "class CustomThreadRuntimeCore {}",
        "export const OtherThreadRuntimeCore = {};",
        "class ThreadRuntimeCore {}",
      ].join("\n"),
    },
    (root) => {
      assert.deepEqual(
        runCheck(root).violations.map(({ line, name }) => ({ line, name })),
        [
          { line: 2, name: "ThreadRuntimeCore declaration" },
          { line: 3, name: "ThreadRuntimeCore declaration" },
          { line: 4, name: "ThreadRuntimeCore declaration" },
        ],
      );
    },
  );
});

test("functional increments and notifyUpdate declarations are reported", () => {
  withWorkspace(
    {
      "packages/adapter/src/extras.ts": extrasImport,
      "packages/adapter/src/runtime.ts": [
        "setFoo((n) => n + 1);",
        "setFoo(n => n + 1);",
        "setFoo((prev) => prev + 1);",
        "useReducer((x) => x + 1, 0);",
        "function notifyUpdate() {}",
        "class Runtime { notifyUpdate() {} }",
        "const other = () => setFoo((n) => n + 10);",
      ].join("\n"),
    },
    (root) => {
      assert.deepEqual(
        runCheck(root).violations.map(({ line, name }) => ({ line, name })),
        [
          { line: 1, name: "version counter" },
          { line: 2, name: "version counter" },
          { line: 3, name: "version counter" },
          { line: 4, name: "version counter" },
          { line: 5, name: "notifyUpdate" },
          { line: 6, name: "notifyUpdate" },
        ],
      );
    },
  );
});

test("Symbol.for brands and prototype grafting are reported but sentinels and dictionaries are allowed", () => {
  withWorkspace(
    {
      "packages/adapter/src/extras.ts": extrasImport,
      "packages/adapter/src/runtime.ts": [
        'const sentinel = Symbol("stopped");',
        'const shared = Symbol.for("shared");',
        "const grafted = Object.create(base);",
        "const dictionary = Object.create(null);",
      ].join("\n"),
    },
    (root) => {
      const result = runExecutable(root);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.equal(
        result.stderr,
        [
          'packages/adapter/src/runtime.ts:2: Symbol brand: Symbol.for("shared")',
          "packages/adapter/src/runtime.ts:3: Object.create grafting: Object.create(base)",
          "",
        ].join("\n"),
      );
    },
  );
});

test("test files and packages without a source import are ignored", () => {
  withWorkspace(
    {
      "packages/adapter/src/extras.ts": extrasImport,
      "packages/adapter/src/runtime.test.ts": "Symbol();",
      "packages/adapter/src/runtime.spec.tsx": "Object.create(base);",
      "packages/adapter/src/test/runtime.ts": "Symbol.for('test');",
      "packages/adapter/src/__tests__/runtime.ts":
        "class BadThreadRuntimeCore {}",
      "packages/plain/src/runtime.ts": "Symbol(); Object.create(base);",
      "packages/plain/src/extras.test.ts": extrasImport,
      "packages/core/src/extras.ts": `${extrasImport}Symbol();`,
    },
    (root) => {
      assert.deepEqual(runCheck(root), { packageCount: 1, violations: [] });
    },
  );
});

test("a clean adapter exits 0 without output", () => {
  withWorkspace(
    {
      "packages/adapter/src/extras.ts": extrasImport,
      "packages/adapter/src/runtime.ts":
        'import type { ThreadRuntimeCore } from "@assistant-ui/core";\nexport const runtime = {};\n',
    },
    (root) => {
      const result = runExecutable(root);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
    },
  );
});
