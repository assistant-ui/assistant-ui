import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
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
    return spawnSync(
      "pnpm",
      ["exec", "tsc", "--project", probe.configPath, "--pretty", "false"],
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

test("expands wildcard declaration exports", () => {
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
