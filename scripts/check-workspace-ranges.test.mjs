import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  dedupesWithCaret,
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

function consumer(dependencies, field = "dependencies") {
  return {
    manifest: "packages/consumer/package.json",
    pkg: { name: "@fixture/consumer", version: "1.0.0", [field]: dependencies },
  };
}

const dep = {
  manifest: "packages/dep/package.json",
  pkg: { name: "@fixture/dep", version: "1.0.0" },
};

test("only ranges that unify with a caret are accepted", () => {
  for (const range of ["workspace:^", "^1.0.0", "*"]) {
    assert.equal(dedupesWithCaret(range), true, range);
  }
  for (const range of [
    "workspace:*",
    "workspace:~",
    "workspace:1.0.0",
    "1.0.0",
    "~1.0.0",
    "=1.0.0",
    ">=1.0.0 <1.1.0",
  ]) {
    assert.equal(dedupesWithCaret(range), false, range);
  }
});

test("a pin is reported whichever spelling it uses", () => {
  const problems = findNarrowWorkspaceRanges([
    dep,
    {
      manifest: "packages/protocol/package.json",
      pkg: {
        name: "@fixture/protocol",
        version: "1.0.0",
        dependencies: { "@fixture/dep": "workspace:*" },
      },
    },
    {
      manifest: "packages/literal/package.json",
      pkg: {
        name: "@fixture/literal",
        version: "1.0.0",
        peerDependencies: { "@fixture/dep": "1.0.0" },
      },
    },
    {
      manifest: "packages/tilde/package.json",
      pkg: {
        name: "@fixture/tilde",
        version: "1.0.0",
        optionalDependencies: { "@fixture/dep": "~1.0.0" },
      },
    },
  ]);

  assert.deepEqual(
    problems.map(({ name, field, range }) => ({ name, field, range })),
    [
      {
        name: "@fixture/protocol",
        field: "dependencies",
        range: "workspace:*",
      },
      { name: "@fixture/literal", field: "peerDependencies", range: "1.0.0" },
      {
        name: "@fixture/tilde",
        field: "optionalDependencies",
        range: "~1.0.0",
      },
    ],
  );
});

test("an aliased key does not hide a workspace protocol range", () => {
  const problems = findNarrowWorkspaceRanges([
    dep,
    consumer({ "dep-alias": "workspace:*" }),
  ]);

  assert.deepEqual(
    problems.map(({ dependency, range }) => ({ dependency, range })),
    [{ dependency: "dep-alias", range: "workspace:*" }],
  );
});

test("a pinned dependency outside the workspace is not this check's business", () => {
  assert.deepEqual(
    findNarrowWorkspaceRanges([
      dep,
      consumer({ "react-dom": "19.2.3", "ts-alias": "npm:typescript@5.9.3" }),
    ]),
    [],
  );
});

test("fields that never ship and private packages are exempt", () => {
  const problems = findNarrowWorkspaceRanges([
    dep,
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
      /All published workspace dependencies deduplicate\./,
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
        dependencies: { "@fixture/dep": "1.0.0" },
      },
    ],
  ]);
  try {
    const result = runExecutable(root);
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /packages\/consumer\/package\.json: "@fixture\/consumer" dependencies\["@fixture\/dep"\] is "1\.0\.0"/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
