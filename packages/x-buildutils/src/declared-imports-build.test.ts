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
import { join, resolve } from "node:path";
import test, { type TestContext } from "node:test";

const packageDir = resolve(import.meta.dirname, "..");
const dependency = "build-guard-fixture-dependency";
const sources = {
  statement: `import { value } from "${dependency}"; export { value };`,
  inline: `export type Value = import("${dependency}").Value;`,
  reference: `/// <reference types="${dependency}" preserve="true" />\nexport {};`,
};

const fixture = (t: TestContext, source: string, declared = false) => {
  const cwd = mkdtempSync(join(tmpdir(), "aui-import-guard-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const files = {
    "package.json": JSON.stringify({
      name: "build-guard-fixture",
      version: "1.0.0",
      type: "module",
      ...(declared ? { dependencies: { [dependency]: "1.0.0" } } : {}),
    }),
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        verbatimModuleSyntax: true,
        types: [],
        noEmit: true,
      },
      include: ["src"],
    }),
    "src/index.ts": source,
    [`node_modules/${dependency}/package.json`]: JSON.stringify({
      name: dependency,
      version: "1.0.0",
      type: "module",
      main: "index.js",
      types: "index.d.ts",
    }),
    [`node_modules/${dependency}/index.js`]: "export const value = 42;",
    [`node_modules/${dependency}/index.d.ts`]:
      "export interface Value { value: number }\nexport declare const value: number;",
  };
  for (const [file, content] of Object.entries(files)) {
    const path = join(cwd, file);
    mkdirSync(resolve(path, ".."), { recursive: true });
    writeFileSync(path, content);
  }
  return cwd;
};

const build = (cwd: string) => {
  const result = spawnSync(
    process.execPath,
    [join(packageDir, "bin/aui-build.js")],
    {
      cwd,
      encoding: "utf8",
      timeout: 120_000,
    },
  );
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return { status: result.status, output: result.stdout + result.stderr };
};

for (const [shape, source] of Object.entries(sources)) {
  test(
    `aui-build rejects an undeclared ${shape} import`,
    { timeout: 180_000 },
    (t) => {
      const cwd = fixture(t, source);
      const { status, output } = build(cwd);
      assert.equal(status, 1, output);
      assert.doesNotMatch(output, /TS2307|Cannot find module/);
      assert.match(output, new RegExp(dependency));
      if (shape === "statement") {
        assert.match(output, /onlyImport/);
      } else {
        assert.match(
          output,
          /Declarations reference packages build-guard-fixture does not declare:/,
        );
        assert.match(output, /index\.d\.ts/);
        assert.match(
          readFileSync(join(cwd, "dist/index.d.ts"), "utf8"),
          new RegExp(dependency),
        );
      }
    },
  );
}

test(
  "aui-build emits executable output when the fixture dependency is declared",
  { timeout: 180_000 },
  (t) => {
    const cwd = fixture(
      t,
      [sources.reference, sources.inline, sources.statement].join("\n"),
      true,
    );
    const { status, output } = build(cwd);
    assert.equal(status, 0, output);
    const declaration = readFileSync(join(cwd, "dist/index.d.ts"), "utf8");
    assert.match(
      declaration,
      /^\/\/\/ <reference types="build-guard-fixture-dependency" /m,
    );
    assert.match(declaration, /import\("build-guard-fixture-dependency"\)/);
    const execution = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'import assert from "node:assert/strict"; import { value } from "./dist/index.js"; assert.equal(value, 42);',
      ],
      {
        cwd,
        encoding: "utf8",
        timeout: 30_000,
      },
    );
    assert.ifError(execution.error);
    assert.equal(execution.signal, null);
    assert.equal(execution.status, 0, execution.stdout + execution.stderr);
  },
);
