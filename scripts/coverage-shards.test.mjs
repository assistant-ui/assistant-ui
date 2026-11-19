import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  cachedCoverageWorkspaces,
  coverageShards,
  parseCoverageShards,
} from "./coverage-shards.mjs";

function workspace(t, packages) {
  const root = mkdtempSync(path.join(tmpdir(), "coverage-shards-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    path.join(root, "pnpm-workspace.yaml"),
    'packages:\n  - "packages/*"\npmOnFail: ignore\ncacheDir: ".cache/pnpm"\n',
  );
  for (const { name, tests, coverage = true } of packages) {
    const dir = path.join(root, "packages", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name,
        scripts: coverage ? { "test:coverage": "node --test" } : {},
      }),
    );
    for (let i = 0; i < tests; i++)
      writeFileSync(path.join(dir, `${i}.test.ts`), "");
  }
  return root;
}

test("each coverage workspace runs once, including workspaces without colocated tests", (t) => {
  const root = workspace(t, [
    { name: "large", tests: 10 },
    { name: "medium", tests: 8 },
    { name: "small", tests: 2 },
    { name: "external", tests: 0 },
    { name: "build-only", tests: 5, coverage: false },
  ]);
  const shards = coverageShards(root);
  assert.deepEqual(shards.flat().sort(), [
    "external",
    "large",
    "medium",
    "small",
  ]);
  assert.notEqual(
    shards.findIndex((s) => s.includes("large")),
    shards.findIndex((s) => s.includes("medium")),
  );
  assert.deepEqual(coverageShards(root), shards);
});

test("installed dependency tests do not affect shard assignment", (t) => {
  const root = workspace(t, [
    { name: "a", tests: 4 },
    { name: "b", tests: 3 },
    { name: "c", tests: 2 },
  ]);
  const before = coverageShards(root);
  const installed = path.join(root, "packages/c/node_modules/dependency");
  mkdirSync(installed, { recursive: true });
  for (let i = 0; i < 10; i++)
    writeFileSync(path.join(installed, `${i}.test.ts`), "");
  assert.deepEqual(coverageShards(root), before);
});

test("balances recorded runtimes when equal file counts hide unequal work", (t) => {
  const root = workspace(
    t,
    ["a", "b", "c", "d"].map((name) => ({ name, tests: 1 })),
  );
  const runtimesMs = { a: 9000, b: 1000, c: 8000, d: 2000 };
  const shards = coverageShards(root, runtimesMs);
  assert.deepEqual(shards.flat().sort(), ["a", "b", "c", "d"]);
  assert.deepEqual(
    shards.map((names) =>
      names.reduce((sum, name) => sum + runtimesMs[name], 0),
    ),
    [10000, 10000],
  );
});

test("retains unmeasured workspaces with the median recorded runtime", (t) => {
  const root = workspace(t, [
    { name: "known", tests: 1 },
    { name: "new", tests: 0 },
    { name: "small", tests: 20 },
  ]);
  const shards = coverageShards(root, { known: 9000, small: 1000 });
  assert.deepEqual(shards, [["known"], ["new", "small"]]);
});

test("a lone cache miss runs alone while cached workspaces replay on the other shard", (t) => {
  const root = workspace(
    t,
    ["docs", "a", "b", "c"].map((name) => ({ name, tests: 1 })),
  );
  const runtimesMs = { docs: 150000, a: 100000, b: 90000, c: 10000 };
  assert.deepEqual(coverageShards(root, runtimesMs), [
    ["docs", "c"],
    ["a", "b"],
  ]);
  assert.deepEqual(coverageShards(root, runtimesMs, new Set(["a", "b", "c"])), [
    ["docs"],
    ["a", "b", "c"],
  ]);
});

test("cache misses the static split would pair are placed on different shards", (t) => {
  const root = workspace(
    t,
    ["a", "b", "c", "d"].map((name) => ({ name, tests: 1 })),
  );
  const runtimesMs = { a: 100000, b: 60000, c: 50000, d: 10000 };
  const pairedStatically = coverageShards(root, runtimesMs).find(
    (names) => names.includes("b") && names.includes("c"),
  );
  assert(pairedStatically);
  const shards = coverageShards(root, runtimesMs, new Set(["a", "d"]));
  assert.notEqual(
    shards.findIndex((names) => names.includes("b")),
    shards.findIndex((names) => names.includes("c")),
  );
  assert.deepEqual(shards.flat().sort(), ["a", "b", "c", "d"]);
});

test("a fully cached graph still gives both shards workspaces", (t) => {
  const root = workspace(
    t,
    ["a", "b", "c", "d"].map((name) => ({ name, tests: 1 })),
  );
  const shards = coverageShards(
    root,
    { a: 4000, b: 3000, c: 2000, d: 1000 },
    new Set(["a", "b", "c", "d"]),
  );
  assert.deepEqual(shards, [
    ["a", "c"],
    ["b", "d"],
  ]);
});

test("the CLI moves cached workspaces off the shard that runs the cache misses", (t) => {
  const root = workspace(t, [
    { name: "first", tests: 1 },
    { name: "second", tests: 1 },
  ]);
  const repoRoot = fileURLToPath(new URL("../", import.meta.url));
  mkdirSync(path.join(root, "scripts"));
  for (const file of [
    "coverage-shards.mjs",
    "coverage-runtimes.mjs",
    "coverage-runtimes.json",
    "lib",
  ]) {
    cpSync(
      path.join(repoRoot, "scripts", file),
      path.join(root, "scripts", file),
      { recursive: true },
    );
  }
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "coverage-fixture",
      private: true,
      packageManager: "pnpm@12.14.0",
      scripts: { "test:coverage": "turbo test:coverage --concurrency=2" },
    }),
  );
  writeFileSync(
    path.join(root, "turbo.json"),
    JSON.stringify({
      tasks: { "test:coverage": { outputs: ["coverage/**"] } },
    }),
  );
  writeFileSync(
    path.join(root, ".gitignore"),
    ".turbo\nnode_modules\ndry-run.json\n",
  );
  const options = {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    env: {
      ...process.env,
      PATH: `${path.join(repoRoot, "node_modules/.bin")}${path.delimiter}${process.env.PATH}`,
    },
  };
  const dryRun = path.join(root, "dry-run.json");
  const plan = () => {
    writeFileSync(
      dryRun,
      execFileSync(
        "pnpm",
        ["--silent", "run", "test:coverage", "--dry=json", "--cache=local:r"],
        options,
      ),
    );
    return execFileSync(
      process.execPath,
      ["scripts/coverage-shards.mjs", "--plan", dryRun],
      options,
    ).trim();
  };
  const shard = (index, split) =>
    execFileSync(
      process.execPath,
      ["scripts/coverage-shards.mjs", String(index)],
      { ...options, env: { ...options.env, COVERAGE_SHARDS: split } },
    ).trim();
  execFileSync("pnpm", ["install", "--offline"], options);
  const cold = plan();
  assert.deepEqual(
    cachedCoverageWorkspaces(JSON.parse(readFileSync(dryRun, "utf8"))),
    new Set(),
  );
  assert.equal(cold, JSON.stringify([["first"], ["second"]]));
  assert.equal(
    execFileSync(
      process.execPath,
      ["scripts/coverage-shards.mjs", "--plan"],
      options,
    ).trim(),
    cold,
  );
  assert.deepEqual(
    [shard(0, cold), shard(1, cold)],
    ["--filter=first", "--filter=second"],
  );

  execFileSync("pnpm", ["test:coverage", "--filter=first"], options);
  const warm = plan();
  assert.deepEqual(
    cachedCoverageWorkspaces(JSON.parse(readFileSync(dryRun, "utf8"))),
    new Set(["first"]),
  );
  assert.equal(warm, JSON.stringify([["second"], ["first"]]));
  assert.deepEqual(
    [shard(0, warm), shard(1, warm)],
    ["--filter=second", "--filter=first"],
  );
});

test("a dry run without cache status or coverage tasks fails instead of guessing a split", () => {
  assert.throws(
    () =>
      cachedCoverageWorkspaces({
        tasks: [{ task: "test:coverage", package: "a", command: "vitest" }],
      }),
    /no cache status for a\. Check that `pnpm run test:coverage --dry=json`/,
  );
  for (const plan of [
    {},
    { tasks: [] },
    {
      tasks: [
        { task: "test:coverage", package: "a", command: "<NONEXISTENT>" },
      ],
    },
    {
      tasks: [
        {
          task: "build",
          package: "a",
          command: "tsc",
          cache: { status: "HIT" },
        },
      ],
    },
  ]) {
    assert.throws(
      () => cachedCoverageWorkspaces(plan),
      /listed no test:coverage tasks/,
    );
  }
});

test("a split must assign every coverage workspace to exactly one of two non-empty shards", (t) => {
  const root = workspace(t, [
    ...["a", "b", "c"].map((name) => ({ name, tests: 1 })),
    { name: "build-only", tests: 1, coverage: false },
  ]);
  const split = JSON.stringify(coverageShards(root, { a: 3, b: 2, c: 1 }));
  assert.deepEqual(parseCoverageShards(split, root), JSON.parse(split));
  for (const [shards, message] of [
    [[["a"], ["b"]], /missing: c/],
    [
      [
        ["a", "b"],
        ["b", "c"],
      ],
      /duplicated: b/,
    ],
    [
      [
        ["a", "b"],
        ["c", "build-only"],
      ],
      /unknown: build-only/,
    ],
    [[["a", "b", "c"], []], /two non-empty workspace lists/],
    [[["a"], ["b"], ["c"]], /two non-empty workspace lists/],
    [{ 0: ["a"], 1: ["b", "c"] }, /two non-empty workspace lists/],
  ]) {
    assert.throws(
      () => parseCoverageShards(JSON.stringify(shards), root),
      message,
    );
  }
  for (const missing of [undefined, ""]) {
    assert.throws(
      () => parseCoverageShards(missing, root),
      /Pass the split that `node scripts\/coverage-shards\.mjs --plan` printed/,
    );
  }
});

test("rejects unusable timing profiles instead of assigning invalid weights", (t) => {
  const root = workspace(t, [{ name: "a", tests: 1 }]);
  for (const profile of [{}, { a: 0 }, { a: -1 }, { a: "100" }, { a: NaN }]) {
    assert.throws(
      () => coverageShards(root, profile),
      /positive millisecond values/,
    );
  }
});

test("the CLI emits each shard's filters from the plan, verifies the plan, and rejects a missing plan or invalid shard index", (t) => {
  const script = fileURLToPath(
    new URL("./coverage-shards.mjs", import.meta.url),
  );
  const run = (args, env = {}) =>
    execFileSync(process.execPath, [script, ...args], {
      encoding: "utf8",
      stdio: "pipe",
      env: { ...process.env, ...env },
    });
  const split = run(["--plan"]).trim();
  assert.deepEqual(JSON.parse(split), coverageShards());
  for (const index of [0, 1]) {
    assert.deepEqual(
      run([String(index)], { COVERAGE_SHARDS: split })
        .trim()
        .split("\n"),
      coverageShards()[index].map((name) => `--filter=${name}`),
    );
  }
  assert.doesNotThrow(() => run(["--verify", split]));
  const [first, second] = JSON.parse(split);
  for (const tampered of [
    [first.slice(1), second],
    [first, [...second, first[0]]],
  ]) {
    assert.throws(
      () => run(["--verify", JSON.stringify(tampered)]),
      new RegExp(`(missing|duplicated): ${first[0]}`),
    );
  }
  assert.throws(() => run(["--verify"]), /Pass the split/);
  assert.throws(() => run(["0"]), /Pass the split/);
  assert.throws(() => run(["2"], { COVERAGE_SHARDS: split }));

  const dir = mkdtempSync(path.join(tmpdir(), "coverage-dry-run-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const dryRun = path.join(dir, "dry-run.json");
  writeFileSync(dryRun, JSON.stringify({ tasks: [] }));
  assert.throws(() => run(["--plan", dryRun]), /listed no test:coverage tasks/);
});

for (const [shard, empty] of [
  [0, false],
  [1, false],
  [1, true],
]) {
  test(`shard ${shard} prebuilds only its coverage and compiler prerequisites${empty ? " (empty graph)" : ""}`, (t) => {
    const root = workspace(t, [
      { name: "first", tests: 10 },
      { name: "second", tests: 9 },
      ...[
        "shared",
        "transitive",
        "compiler",
        "compiler-runtime",
        "unrelated",
      ].map((name) => ({ name, tests: 0, coverage: false })),
    ]);
    const repoRoot = fileURLToPath(new URL("../", import.meta.url));
    mkdirSync(path.join(root, "scripts"));
    for (const file of [
      "coverage-shards.mjs",
      "coverage-runtimes.mjs",
      "coverage-runtimes.json",
      "lib",
    ]) {
      cpSync(
        path.join(repoRoot, "scripts", file),
        path.join(root, "scripts", file),
        { recursive: true },
      );
    }
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "coverage-fixture",
        private: true,
        packageManager: "pnpm@12.14.0",
        scripts: {
          "test:coverage": "turbo test:coverage --concurrency=2",
          "test:react-compiler": "turbo test:react-compiler --filter=compiler",
        },
      }),
    );
    writeFileSync(
      path.join(root, "turbo.json"),
      JSON.stringify({
        tasks: {
          build: { dependsOn: ["^build"], outputs: ["built"] },
          "test:coverage": { dependsOn: empty ? [] : ["^build"] },
          "test:react-compiler": { dependsOn: ["build"] },
        },
      }),
    );
    for (const [name, dependency] of Object.entries({
      first: "shared",
      second: "shared",
      shared: "transitive",
      transitive: null,
      compiler: "compiler-runtime",
      "compiler-runtime": null,
      unrelated: null,
    })) {
      const manifest = path.join(root, "packages", name, "package.json");
      const pkg = JSON.parse(readFileSync(manifest, "utf8"));
      pkg.scripts.build =
        "node -e \"require('fs').writeFileSync('built', '')\"";
      if (name === "compiler")
        pkg.scripts["test:react-compiler"] = "node --test";
      if (dependency) pkg.dependencies = { [dependency]: "workspace:*" };
      writeFileSync(manifest, JSON.stringify(pkg));
    }
    writeFileSync(
      path.join(root, "packages/second/turbo.json"),
      JSON.stringify({
        extends: ["//"],
        tasks: {
          "test:coverage": { dependsOn: empty ? [] : ["^build", "build"] },
        },
      }),
    );
    const workflow = readFileSync(
      path.join(repoRoot, ".github/workflows/test-coverage.yaml"),
      "utf8",
    );
    const step = workflow
      .split("      - name: Build packages\n")[1]
      .split("      - name:")[0];
    const command = step
      .split("        run: ")[1]
      .trim()
      .replace(/^\|\n/, "")
      .replace(/^ {10}/gm, "")
      .replaceAll("${{ matrix.shard }}", String(shard));
    const options = {
      cwd: root,
      stdio: "pipe",
      env: {
        ...process.env,
        PATH: `${path.join(repoRoot, "node_modules/.bin")}${path.delimiter}${process.env.PATH}`,
      },
    };
    execFileSync("pnpm", ["install", "--offline"], options);
    const split = execFileSync(
      process.execPath,
      ["scripts/coverage-shards.mjs", "--plan"],
      { ...options, encoding: "utf8" },
    ).trim();
    execFileSync("bash", ["-e", "-o", "pipefail", "-c", command], {
      ...options,
      env: { ...options.env, COVERAGE_SHARDS: split },
    });
    const built = [
      "first",
      "second",
      "shared",
      "transitive",
      "compiler",
      "compiler-runtime",
      "unrelated",
    ]
      .filter((name) => existsSync(path.join(root, "packages", name, "built")))
      .sort();
    assert.deepEqual(
      built,
      empty
        ? []
        : shard === 0
          ? ["compiler", "compiler-runtime", "shared", "transitive"]
          : ["second", "shared", "transitive"],
    );
  });
}
