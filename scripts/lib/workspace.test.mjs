import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { collectPackages, posixPath, readJson } from "./workspace.mjs";

const makeRepo = (packages) => {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "workspace-test-"));
  for (const [dir, pkg] of Object.entries(packages)) {
    const packageDir = path.join(repoRoot, "packages", dir);
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(path.join(packageDir, "package.json"), JSON.stringify(pkg));
  }
  return repoRoot;
};

const byName = (a, b) => a.localeCompare(b);

test("collectPackages skips private packages and sorts by comparator", () => {
  const repoRoot = makeRepo({
    zeta: { name: "zeta" },
    alpha: { name: "alpha" },
    hidden: { name: "hidden", private: true },
  });
  try {
    const names = collectPackages(repoRoot, null, byName).map(
      ({ pkg }) => pkg.name,
    );
    assert.deepEqual(names, ["alpha", "zeta"]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("collectPackages honors the filtered name set", () => {
  const repoRoot = makeRepo({
    alpha: { name: "alpha" },
    beta: { name: "beta" },
  });
  try {
    const names = collectPackages(repoRoot, new Set(["beta"]), byName).map(
      ({ pkg }) => pkg.name,
    );
    assert.deepEqual(names, ["beta"]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("collectPackages ignores directories without a package.json", () => {
  const repoRoot = makeRepo({ alpha: { name: "alpha" } });
  mkdirSync(path.join(repoRoot, "packages", "empty"));
  try {
    const names = collectPackages(repoRoot, null, byName).map(
      ({ pkg }) => pkg.name,
    );
    assert.deepEqual(names, ["alpha"]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("posixPath and readJson round-trip", () => {
  assert.equal(posixPath("a\\b\\c.ts"), "a/b/c.ts");
  const repoRoot = makeRepo({ alpha: { name: "alpha" } });
  try {
    assert.deepEqual(
      readJson(path.join(repoRoot, "packages", "alpha", "package.json")),
      { name: "alpha" },
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
