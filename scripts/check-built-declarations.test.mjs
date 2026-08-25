import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectDeclarationEntries,
  createDeclarationProbe,
  declarationGateResult,
  isExecutedAsMain,
  isOwnDeclarationFile,
  ownDeclarationDiagnostics,
  parseUnanchoredTscErrors,
} from "./check-built-declarations.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

function createFixture(declaration) {
  const packageDir = mkdtempSync(path.join(tmpdir(), "aui-libcheck-"));
  mkdirSync(path.join(packageDir, "dist"));
  writeFileSync(
    path.join(packageDir, "package.json"),
    JSON.stringify({
      name: "fixture-package",
      type: "module",
      exports: { ".": { types: "./dist/index.d.ts" } },
    }),
  );
  writeFileSync(
    path.join(packageDir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
      },
    }),
  );
  writeFileSync(path.join(packageDir, "dist/index.d.ts"), declaration);
  return packageDir;
}

function runProbe(packageDir) {
  const pkg = JSON.parse(
    readFileSync(path.join(packageDir, "package.json"), "utf8"),
  );
  const probe = createDeclarationProbe(packageDir, pkg);
  assert.ok(probe);
  try {
    const local = path.join(repoRoot, "node_modules", ".bin", "tsc");
    return spawnSync(
      existsSync(local) ? local : "tsc",
      ["--project", probe.configPath, "--pretty", "false"],
      { cwd: repoRoot, encoding: "utf8" },
    );
  } finally {
    probe.remove();
  }
}

test("accepts internally consistent built declarations", () => {
  const packageDir = createFixture("export interface PresentType {}\n");
  try {
    const result = runProbe(packageDir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally {
    rmSync(packageDir, { recursive: true, force: true });
  }
});

test("rejects dangling types in built declarations", () => {
  const packageDir = createFixture(
    "export declare const broken: MissingType;\n",
  );
  try {
    const result = runProbe(packageDir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stdout + result.stderr,
      /Cannot find name 'MissingType'/,
    );
  } finally {
    rmSync(packageDir, { recursive: true, force: true });
  }
});

test("ignores declaration errors outside the package", () => {
  const packageDir = path.join(repoRoot, "packages", "core");
  const output = [
    "node_modules/.pnpm/@types+node@26.2.0/node_modules/@types/node/globals.d.ts(3,13): error TS2451: Cannot redeclare block-scoped variable 'process'.",
    "packages/x-buildutils/types/browser-process/index.d.ts(6,15): error TS2451: Cannot redeclare block-scoped variable 'process'.",
    "node_modules/.pnpm/@radix-ui+primitive@1.1.7/node_modules/@radix-ui/primitive/dist/index.d.mts(18,36): error TS2304: Cannot find name 'setImmediate'.",
  ].join("\n");
  assert.deepEqual(ownDeclarationDiagnostics(packageDir, output, repoRoot), []);
  assert.equal(
    isOwnDeclarationFile(packageDir, "packages/core/dist/index.d.ts", repoRoot),
    true,
  );
});

test("keeps dangling types from the package dist", () => {
  const packageDir = path.join(repoRoot, "packages", "core");
  const output =
    "packages/core/dist/index.d.ts(12,14): error TS2304: Cannot find name 'MissingType'.";
  assert.deepEqual(ownDeclarationDiagnostics(packageDir, output, repoRoot), [
    "packages/core/dist/index.d.ts",
  ]);
});

test("expands a single-directory wildcard types target", () => {
  const packageDir = createFixture("export {};\n");
  mkdirSync(path.join(packageDir, "dist/features"));
  writeFileSync(
    path.join(packageDir, "dist/features/alpha.d.ts"),
    "export {};\n",
  );
  writeFileSync(
    path.join(packageDir, "dist/features/beta.d.ts"),
    "export {};\n",
  );
  try {
    const entries = collectDeclarationEntries(packageDir, {
      exports: {
        "./features/*": { types: "./dist/features/*.d.ts" },
      },
    });
    assert.deepEqual(
      entries.map((entry) => path.basename(entry.file)),
      ["alpha.d.ts", "beta.d.ts"],
    );
  } finally {
    rmSync(packageDir, { recursive: true, force: true });
  }
});

test("fails when tsc cannot spawn or reports no file-anchored errors", () => {
  assert.equal(
    declarationGateResult({
      spawnError: new Error("ENOENT"),
      status: null,
      ownFiles: [],
      parsedFiles: [],
    }),
    "spawn-failed",
  );
  assert.equal(
    declarationGateResult({
      spawnError: undefined,
      status: 1,
      ownFiles: [],
      parsedFiles: [],
    }),
    "unparsed-failure",
  );
  assert.equal(
    declarationGateResult({
      spawnError: undefined,
      status: 2,
      ownFiles: [],
      parsedFiles: ["node_modules/dep/index.d.ts"],
    }),
    "pass",
  );
  assert.equal(
    declarationGateResult({
      spawnError: undefined,
      status: 2,
      ownFiles: [],
      parsedFiles: ["node_modules/dep/index.d.ts"],
      unanchoredLines: [
        "error TS2688: Cannot find type definition file for 'browser-process'.",
      ],
    }),
    "unparsed-failure",
  );
});

test("keeps only unanchored tsc error lines", () => {
  assert.deepEqual(
    parseUnanchoredTscErrors(
      [
        "error TS2688: Cannot find type definition file for 'browser-process'.",
        "node_modules/dep/index.d.ts(1,1): error TS2307: Cannot find module 'x'.",
        "  Type 'X' is not assignable to type 'Y'.",
      ].join("\n"),
    ),
    ["error TS2688: Cannot find type definition file for 'browser-process'."],
  );
});

test("treats symlink-equivalent paths as the main module", () => {
  const script = path.join(import.meta.dirname, "check-built-declarations.mjs");
  assert.equal(isExecutedAsMain(import.meta.url, script), false);
  assert.equal(
    isExecutedAsMain(
      import.meta.resolve("./check-built-declarations.mjs"),
      script,
    ),
    true,
  );
  assert.equal(isExecutedAsMain(import.meta.url, undefined), false);
});
