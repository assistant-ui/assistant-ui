import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectDeclarationEntries,
  checkPackage,
  checkPackages,
  declarationConcurrency,
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

async function runProbe(packageDir) {
  const pkg = JSON.parse(
    readFileSync(path.join(packageDir, "package.json"), "utf8"),
  );
  const progress = [];
  const checking = checkPackage(repoRoot, packageDir, pkg, (line) =>
    progress.push(line),
  );
  assert.deepEqual(progress, [
    "Checking fixture-package (1 declaration entries)\n",
  ]);
  const result = await checking;
  result.stdout = progress.join("") + result.stdout;
  assert.deepEqual(
    readdirSync(packageDir).filter((name) =>
      name.startsWith(".strict-libcheck-"),
    ),
    [],
  );
  return result;
}

test("accepts internally consistent built declarations", async () => {
  const packageDir = createFixture("export interface PresentType {}\n");
  try {
    const result = await runProbe(packageDir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally {
    rmSync(packageDir, { recursive: true, force: true });
  }
});

test("rejects dangling types in built declarations", async () => {
  const packageDir = createFixture(
    "export declare const broken: MissingType;\n",
  );
  try {
    const result = await runProbe(packageDir);
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

test("limits compiler concurrency and retains package order after an early failure", async () => {
  const packages = Array.from({ length: 4 }, (_, index) => ({
    packageDir: String(index),
    pkg: {},
  }));
  const gates = packages.map(() => Promise.withResolvers());
  const started = [];
  const checking = checkPackages("unused", packages, 2, async (_, dir) => {
    const index = Number(dir);
    started.push(index);
    await gates[index].promise;
    return { status: index === 1 ? 1 : 0, stdout: dir, stderr: "" };
  });
  assert.deepEqual(started, [0, 1]);
  gates[1].resolve();
  await new Promise(setImmediate);
  assert.deepEqual(started, [0, 1, 2]);
  gates[2].resolve();
  await new Promise(setImmediate);
  assert.deepEqual(started, [0, 1, 2, 3]);
  gates[3].resolve();
  gates[0].resolve();
  const results = await checking;
  assert.deepEqual(
    results.map((result) => result.stdout),
    ["0", "1", "2", "3"],
  );
  assert.deepEqual(
    results.map((result) => result.status),
    [0, 1, 0, 0],
  );
  assert.deepEqual(await checkPackages("unused", [], 2), []);
});

test("accepts only positive integer concurrency limits", () => {
  assert.ok([1, 2].includes(declarationConcurrency()));
  assert.equal(declarationConcurrency("1"), 1);
  assert.equal(declarationConcurrency("2"), 2);
  for (const value of [
    "",
    "0",
    "-1",
    "1.5",
    "NaN",
    "Infinity",
    "9007199254740992",
  ]) {
    assert.throws(() => declarationConcurrency(value), /positive integer/);
  }
});

test("reports completed packages in order before the whole queue finishes", async () => {
  const packages = [0, 1, 2].map((index) => ({
    packageDir: String(index),
    pkg: {},
  }));
  const gates = packages.map(() => Promise.withResolvers());
  const reported = [];
  const checking = checkPackages(
    "unused",
    packages,
    2,
    async (_, dir) => {
      await gates[Number(dir)].promise;
      return dir;
    },
    (result) => reported.push(result),
  );
  gates[1].resolve();
  await new Promise(setImmediate);
  assert.deepEqual(reported, []);
  gates[0].resolve();
  await new Promise(setImmediate);
  assert.deepEqual(reported, ["0", "1"]);
  gates[2].resolve();
  await checking;
  assert.deepEqual(reported, ["0", "1", "2"]);
});

test("compiler process failures retain package context and clean up probes", async () => {
  const dir = createFixture("export {};\n");
  const bin = path.join(dir, "node_modules/.bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(path.join(bin, "tsc"), "not executable");
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(dir, "package.json"), "utf8"),
    );
    const result = await checkPackage(dir, dir, pkg);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /fixture-package: .*EACCES/);
    writeFileSync(
      path.join(bin, "tsc"),
      "#!/bin/sh\necho 'error TS2688: Cannot find type definition file.'\nexit 1\n",
    );
    chmodSync(path.join(bin, "tsc"), 0o755);
    const unanchored = await checkPackage(dir, dir, pkg);
    assert.equal(unanchored.status, 1);
    assert.match(unanchored.stdout, /fixture-package:\nerror TS2688:/);
    assert.deepEqual(
      readdirSync(dir).filter((name) => name.startsWith(".strict-libcheck-")),
      [],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
