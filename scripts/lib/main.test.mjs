import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./main.mjs";

test("isExecutedAsMain resolves aliases and rejects missing or different paths", () => {
  const root = mkdtempSync(path.join(tmpdir(), "main-test-"));
  try {
    const target = fileURLToPath(import.meta.url);
    const alias = path.join(root, "alias.mjs");
    symlinkSync(target, alias);
    assert.equal(isExecutedAsMain(import.meta.url, alias), true);
    assert.equal(isExecutedAsMain(import.meta.url, undefined), false);
    assert.equal(
      isExecutedAsMain(import.meta.url, path.join(root, "missing")),
      false,
    );
    assert.equal(
      isExecutedAsMain(
        import.meta.url,
        fileURLToPath(new URL("./main.mjs", import.meta.url)),
      ),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("script main runs through a symlink", () => {
  const root = mkdtempSync(path.join(tmpdir(), "main-test-"));
  try {
    const target = fileURLToPath(
      new URL("../api-reference-inputs.mjs", import.meta.url),
    );
    const alias = path.join(root, "api-reference-inputs.mjs");
    symlinkSync(target, alias);
    const result = spawnSync(process.execPath, [alias], {
      encoding: "utf8",
      input: "packages/react/src/index.ts\0",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "true\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
