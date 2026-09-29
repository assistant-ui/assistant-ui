import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  compareVersions,
  findDriftedAllowBuilds,
  findInconsistentNodePins,
  findStaleCoursePins,
  findUnmarkedActionRefs,
  lowestSatisfying,
  parseIndentedBlock,
  parseVersion,
  prevailingFloor,
  runCheck,
} from "./check-unmanaged-pins.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

function writeJson(root, file, value) {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(value));
}

function createWorkspace({ problems = false } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-unmanaged-pins-"));
  writeJson(root, "package.json", {
    name: "@fixture/root",
    version: "1.0.0",
  });
  writeJson(root, "packages/source/package.json", {
    name: "@fixture/source",
    version: "1.0.0",
    dependencies: { "fixture-dep": "^2.0.0" },
  });
  writeJson(
    root,
    "apps/docs/lib/xulux/learn/courses/fixture/shared/project/package.json",
    {
      name: "@fixture/course",
      version: "1.0.0",
      dependencies: { "fixture-dep": problems ? "1.0.0" : "2.0.0" },
    },
  );
  writeFileSync(
    path.join(root, "pnpm-workspace.yaml"),
    [
      "packages:",
      "  - packages/*",
      "",
      "allowBuilds:",
      `  esbuild@${problems ? "0.1.0" : "1.2.3"}: true`,
      "  core-js: false",
      "",
    ].join("\n"),
  );
  writeFileSync(
    path.join(root, "pnpm-lock.yaml"),
    [
      "lockfileVersion: '9.0'",
      "",
      "packages:",
      "  esbuild@1.2.3:",
      "    resolution: {integrity: sha512-fixture}",
      "",
    ].join("\n"),
  );
  mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
  writeFileSync(
    path.join(root, ".github", "workflows", "check.yaml"),
    [
      "name: Check",
      "on: push",
      "jobs:",
      "  check:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      `      - uses: actions/checkout@${"a".repeat(40)} # ratchet:actions/checkout@v4`,
      problems
        ? `      - uses: actions/setup-node@${"b".repeat(40)}`
        : `      - uses: actions/setup-node@${"b".repeat(40)} # ratchet:actions/setup-node@v4`,
      "    runtime: node@22",
      `    node-version: ${problems ? "20" : "22"}`,
      "",
    ].join("\n"),
  );
  return root;
}

test("parseVersion reads three-part numeric versions", () => {
  assert.deepEqual(parseVersion("1.2.3"), [1, 2, 3]);
  assert.deepEqual(parseVersion(" 10.20.30 "), [10, 20, 30]);
  assert.equal(parseVersion("1.2"), null);
  assert.equal(parseVersion("v1.2.3"), null);
  assert.equal(parseVersion("not-a-version"), null);
});

test("compareVersions compares each version component", () => {
  assert.equal(compareVersions([1, 2, 3], [1, 2, 3]), 0);
  assert.ok(compareVersions([2, 0, 0], [1, 99, 99]) > 0);
  assert.ok(compareVersions([1, 3, 0], [1, 4, 0]) < 0);
  assert.ok(compareVersions([1, 2, 3], [1, 2, 4]) < 0);
});

test("lowestSatisfying finds simple and aliased range floors", () => {
  for (const range of ["^6.0.2", "~6.0.2", ">=6.0.2", "v6.0.2"]) {
    assert.deepEqual(lowestSatisfying(range), [6, 0, 2], range);
  }
  assert.deepEqual(
    lowestSatisfying("npm:@typescript/typescript6@^6.0.2"),
    [6, 0, 2],
  );
  assert.equal(lowestSatisfying("workspace:*"), null);
  assert.equal(lowestSatisfying("^6.0.2 || ^7.0.0"), null);
  assert.equal(lowestSatisfying("latest"), null);
});

test("parseIndentedBlock collects every top-level block at its entry depth", () => {
  const entries = parseIndentedBlock(
    [
      "packages:",
      "  first@1.2.3: {}",
      "  this is a block scalar line",
      "    nested: ignored",
      "  second@2.3.4: {} # retained package",
      "settings:",
      "  ignored@0.0.1: true",
      "packages:",
      '  "@scope/third@3.4.5": true # scoped package',
      "  'fourth@4.5.6': false",
      "    nested: ignored",
      "",
    ].join("\n"),
    "packages",
  );

  assert.deepEqual(entries, [
    ["first@1.2.3", "{}"],
    ["second@2.3.4", "{}"],
    ["@scope/third@3.4.5", "true"],
    ["fourth@4.5.6", "false"],
  ]);
});

test("findUnmarkedActionRefs rejects tag refs and unusable markers", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const problems = findUnmarkedActionRefs([
    {
      file: ".github/workflows/check.yaml",
      source: [
        "steps:",
        `  - uses: actions/checkout@${sha} # ratchet:actions/checkout@v4`,
        `  - uses: "actions/download-artifact@${sha}" # ratchet:actions/download-artifact@v4`,
        `  - uses: actions/setup-node@${sha}`,
        `  - uses: actions/cache@${sha} # ratchet:actions/checkout@v4`,
        `  - uses: actions/setup-python@${sha} # ratchet:actions/setup-python`,
        `  - uses: actions/labeler@${sha} # ratchet:actions/labeler@`,
        "  - uses: actions/stale@v9 # ratchet:actions/stale@v9.0.0",
        `  - uses: actions/upload-artifact@${sha} # ratchet:exclude`,
        "  - uses: docker://node:24 # ratchet:exclude",
        "  - uses: ./local-action",
      ].join("\n"),
    },
  ]);

  assert.deepEqual(problems, [
    {
      file: ".github/workflows/check.yaml",
      line: 4,
      uses: `actions/setup-node@${sha}`,
      reason: "no ratchet marker",
    },
    {
      file: ".github/workflows/check.yaml",
      line: 5,
      uses: `actions/cache@${sha}`,
      reason: "ratchet marker names actions/checkout",
    },
    {
      file: ".github/workflows/check.yaml",
      line: 6,
      uses: `actions/setup-python@${sha}`,
      reason: "ratchet marker has no version",
    },
    {
      file: ".github/workflows/check.yaml",
      line: 7,
      uses: `actions/labeler@${sha}`,
      reason: "ratchet marker has no version",
    },
    {
      file: ".github/workflows/check.yaml",
      line: 8,
      uses: "actions/stale@v9",
      reason: "not pinned to a commit SHA",
    },
  ]);
});

test("findInconsistentNodePins reports pins outside the most common major", () => {
  assert.deepEqual(
    findInconsistentNodePins([
      {
        file: ".github/workflows/one.yaml",
        source: ["runtime: node@22", "node-version: '22'"].join("\n"),
      },
      {
        file: ".github/workflows/two.yaml",
        source: "node-version: 20",
      },
    ]),
    [
      {
        file: ".github/workflows/two.yaml",
        line: 1,
        major: 20,
        dominant: 22,
      },
    ],
  );
  assert.deepEqual(
    findInconsistentNodePins([
      { file: ".github/workflows/only.yaml", source: "runtime: node@22" },
    ]),
    [],
  );
  assert.deepEqual(
    findInconsistentNodePins([
      {
        file: ".github/workflows/dotted.yaml",
        source: [
          "runtime: node@22",
          "node-version: 20.x",
          "node-version: lts/*",
          "node-version-file: .nvmrc",
          "node-version: ${{ matrix.node }}",
        ].join("\n"),
      },
    ]),
    [
      {
        file: ".github/workflows/dotted.yaml",
        line: 2,
        major: 20,
        dominant: 22,
      },
    ],
  );
});

test("findDriftedAllowBuilds handles scoped version entries", () => {
  const problems = findDriftedAllowBuilds(
    [
      ["esbuild@1.2.3", "true"],
      ["better-sqlite3@9.0.0", "false"],
      ["@scope/pkg@1.0.0", "true"],
      ["core-js", "false"],
    ],
    new Set(["esbuild@1.2.3", "@scope/pkg@1.1.0"]),
  );

  assert.deepEqual(problems, [
    {
      entry: "better-sqlite3@9.0.0",
      value: "false",
      reason: "is not installed",
    },
    {
      entry: "@scope/pkg@1.0.0",
      value: "true",
      reason: "is not installed",
    },
    {
      entry: "@scope/pkg@1.1.0",
      value: null,
      reason: "has no allowBuilds entry",
    },
  ]);
});

test("findStaleCoursePins reports only exact pins below workspace floors", () => {
  const problems = findStaleCoursePins(
    [
      {
        file: "apps/docs/lib/xulux/learn/courses/fixture/shared/project/package.json",
        pkg: {
          dependencies: {
            "fixture-dep": "1.0.0",
            "published-dep": "1.0.0",
            "range-dep": "^1.0.0",
          },
          devDependencies: { "dev-dep": "2.0.0", "unknown-dep": "1.0.0" },
        },
      },
    ],
    new Map([
      ["fixture-dep", [1, 0, 1]],
      ["published-dep", [2, 0, 0]],
      ["range-dep", [2, 0, 0]],
      ["dev-dep", [2, 1, 0]],
    ]),
    new Set(["published-dep"]),
  );

  assert.deepEqual(problems, [
    {
      file: "apps/docs/lib/xulux/learn/courses/fixture/shared/project/package.json",
      name: "fixture-dep",
      pin: "1.0.0",
      floor: "1.0.1",
    },
    {
      file: "apps/docs/lib/xulux/learn/courses/fixture/shared/project/package.json",
      name: "dev-dep",
      pin: "2.0.0",
      floor: "2.1.0",
    },
  ]);
});

test("prevailingFloor picks the most declared floor and breaks ties high", () => {
  assert.deepEqual(
    prevailingFloor(
      new Map([
        ["1.0.0", 3],
        ["2.0.0", 1],
      ]),
    ),
    [1, 0, 0],
  );
  assert.deepEqual(
    prevailingFloor(
      new Map([
        ["1.0.0", 2],
        ["2.0.0", 2],
      ]),
    ),
    [2, 0, 0],
  );
  assert.equal(prevailingFloor(new Map()), null);
});

test("runCheck holds course pins to the prevailing floor, not an outlier", () => {
  const root = mkdtempSync(path.join(tmpdir(), "aui-unmanaged-pins-floor-"));
  try {
    writeJson(root, "package.json", {
      name: "@fixture/root",
      version: "1.0.0",
    });
    for (const [dir, range] of [
      ["one", "^2.0.0"],
      ["two", "^2.0.0"],
      ["three", "^9.0.0"],
    ]) {
      writeJson(root, `packages/${dir}/package.json`, {
        name: `@fixture/${dir}`,
        version: "1.0.0",
        dependencies: { "fixture-dep": range },
      });
    }
    writeJson(
      root,
      "apps/docs/lib/xulux/learn/courses/fixture/shared/project/package.json",
      { name: "@fixture/course", dependencies: { "fixture-dep": "2.0.0" } },
    );
    writeFileSync(
      path.join(root, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );
    writeFileSync(
      path.join(root, "pnpm-lock.yaml"),
      "lockfileVersion: '9.0'\n",
    );
    mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });

    assert.deepEqual(runCheck(root).coursePins, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCheck exempts only the packages the workspace publishes", () => {
  const root = mkdtempSync(path.join(tmpdir(), "aui-unmanaged-pins-private-"));
  try {
    writeJson(root, "package.json", {
      name: "@fixture/root",
      version: "1.0.0",
    });
    writeJson(root, "packages/published/package.json", {
      name: "@fixture/published",
      version: "2.0.0",
    });
    writeJson(root, "packages/private/package.json", {
      name: "@fixture/private",
      version: "2.0.0",
      private: true,
      dependencies: { "@fixture/published": "^2.0.0" },
    });
    writeJson(root, "packages/consumer/package.json", {
      name: "@fixture/consumer",
      version: "1.0.0",
      dependencies: { "@fixture/private": "^2.0.0" },
    });
    writeJson(
      root,
      "apps/docs/lib/xulux/learn/courses/fixture/shared/project/package.json",
      {
        name: "@fixture/course",
        dependencies: {
          "@fixture/private": "1.0.0",
          "@fixture/published": "1.0.0",
        },
      },
    );
    writeFileSync(
      path.join(root, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );
    writeFileSync(
      path.join(root, "pnpm-lock.yaml"),
      "lockfileVersion: '9.0'\n",
    );
    mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });

    assert.deepEqual(
      runCheck(root).coursePins.map(({ name }) => name),
      ["@fixture/private"],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCheck reads workflow, lockfile, workspace, and course fixtures", () => {
  const root = createWorkspace();
  try {
    assert.deepEqual(runCheck(root), {
      workflowCount: 1,
      courseCount: 1,
      unmarked: [],
      nodePins: [],
      allowBuilds: [],
      coursePins: [],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function runExecutable(root) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "check-unmanaged-pins.mjs")],
    {
      encoding: "utf8",
      env: { ...process.env, UNMANAGED_PIN_CHECK_ROOT: root },
    },
  );
}

test("the executable reports success and exits 0", () => {
  const root = createWorkspace();
  try {
    const result = runExecutable(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /Pins outside the update pipeline are current\. \(1 workflow, 1 course project scanned\)/,
      "the guard produced no verdict, so main() never ran",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the executable reports every seeded problem and exits 1", () => {
  const root = createWorkspace({ problems: true });
  try {
    const result = runExecutable(root);
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /actions\/setup-node@b{40} — no ratchet marker/,
    );
    assert.match(result.stderr, /node@20, not node@22/);
    assert.match(result.stderr, /esbuild@0\.1\.0 is not installed/);
    assert.match(
      result.stderr,
      /"fixture-dep" is 1\.0\.0, workspace is on 2\.0\.0/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
