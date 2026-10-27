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
import { coverageShards } from "./coverage-shards.mjs";

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

test("the CLI emits the selected shard filters and rejects invalid shard indexes", () => {
  const script = fileURLToPath(
    new URL("./coverage-shards.mjs", import.meta.url),
  );
  for (const index of [0, 1]) {
    const output = execFileSync(process.execPath, [script, String(index)], {
      encoding: "utf8",
    });
    assert.deepEqual(
      output.trim().split("\n"),
      coverageShards()[index].map((name) => `--filter=${name}`),
    );
  }
  assert.throws(() =>
    execFileSync(process.execPath, [script, "2"], { stdio: "pipe" }),
  );
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
    for (const file of ["coverage-shards.mjs", "lib"]) {
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
    execFileSync("bash", ["-e", "-o", "pipefail", "-c", command], options);
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
