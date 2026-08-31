import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  findNarrowWorkspaceRanges,
  runCheck,
} from "./check-workspace-ranges.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

function createWorkspace(manifests) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-workspace-ranges-"));
  writeFileSync(
    path.join(root, "pnpm-workspace.yaml"),
    "packages:\n  - packages/*\n\nlinkWorkspacePackages: true\n",
  );
  for (const [dir, manifest] of manifests) {
    mkdirSync(path.join(root, "packages", dir), { recursive: true });
    writeFileSync(
      path.join(root, "packages", dir, "package.json"),
      JSON.stringify(manifest),
    );
  }
  return root;
}

test("workspace:^ is the only accepted protocol range", () => {
  const problems = findNarrowWorkspaceRanges([
    {
      manifest: "packages/ok/package.json",
      pkg: {
        name: "@fixture/ok",
        version: "1.0.0",
        dependencies: { "@fixture/dep": "workspace:^" },
      },
    },
    {
      manifest: "packages/star/package.json",
      pkg: {
        name: "@fixture/star",
        version: "1.0.0",
        dependencies: { "@fixture/dep": "workspace:*" },
      },
    },
    {
      manifest: "packages/tilde/package.json",
      pkg: {
        name: "@fixture/tilde",
        version: "1.0.0",
        peerDependencies: { "@fixture/dep": "workspace:~" },
      },
    },
    {
      manifest: "packages/pinned/package.json",
      pkg: {
        name: "@fixture/pinned",
        version: "1.0.0",
        optionalDependencies: { "@fixture/dep": "workspace:1.0.0" },
      },
    },
  ]);

  assert.deepEqual(
    problems.map(({ name, field, range }) => ({ name, field, range })),
    [
      {
        name: "@fixture/star",
        field: "dependencies",
        range: "workspace:*",
      },
      {
        name: "@fixture/tilde",
        field: "peerDependencies",
        range: "workspace:~",
      },
      {
        name: "@fixture/pinned",
        field: "optionalDependencies",
        range: "workspace:1.0.0",
      },
    ],
  );
});

test("fields that never ship and private packages are exempt", () => {
  const problems = findNarrowWorkspaceRanges([
    {
      manifest: "packages/tooling/package.json",
      pkg: {
        name: "@fixture/tooling",
        version: "1.0.0",
        devDependencies: { "@fixture/dep": "workspace:*" },
      },
    },
    {
      manifest: "packages/internal/package.json",
      pkg: {
        name: "@fixture/internal",
        private: true,
        dependencies: { "@fixture/dep": "workspace:*" },
      },
    },
    {
      manifest: "packages/registry/package.json",
      pkg: {
        name: "@fixture/registry",
        version: "1.0.0",
        dependencies: { "@fixture/dep": "^1.0.0" },
      },
    },
  ]);

  assert.deepEqual(problems, []);
});

test("runCheck reads every workspace glob", () => {
  const root = createWorkspace([
    ["dep", { name: "@fixture/dep", version: "1.0.0" }],
    [
      "consumer",
      {
        name: "@fixture/consumer",
        version: "1.0.0",
        dependencies: { "@fixture/dep": "workspace:*" },
      },
    ],
  ]);
  try {
    const { packageCount, problems } = runCheck(root);
    assert.equal(packageCount, 2);
    assert.deepEqual(problems, [
      {
        manifest: "packages/consumer/package.json",
        name: "@fixture/consumer",
        field: "dependencies",
        dependency: "@fixture/dep",
        range: "workspace:*",
      },
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function runExecutable(root) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "check-workspace-ranges.mjs")],
    {
      encoding: "utf8",
      env: { ...process.env, WORKSPACE_RANGE_CHECK_ROOT: root },
    },
  );
}

test("the executable reports success and exits 0", () => {
  const root = createWorkspace([
    ["dep", { name: "@fixture/dep", version: "1.0.0" }],
    [
      "consumer",
      {
        name: "@fixture/consumer",
        version: "1.0.0",
        dependencies: { "@fixture/dep": "workspace:^" },
      },
    ],
  ]);
  try {
    const result = runExecutable(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /All published workspace dependencies use `workspace:\^`\./,
      "the guard produced no verdict, so main() never ran",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the executable reports the offending dependency and exits 1", () => {
  const root = createWorkspace([
    ["dep", { name: "@fixture/dep", version: "1.0.0" }],
    [
      "consumer",
      {
        name: "@fixture/consumer",
        version: "1.0.0",
        dependencies: { "@fixture/dep": "workspace:*" },
      },
    ],
  ]);
  try {
    const result = runExecutable(root);
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /packages\/consumer\/package\.json: "@fixture\/consumer" dependencies\["@fixture\/dep"\] is "workspace:\*"/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
