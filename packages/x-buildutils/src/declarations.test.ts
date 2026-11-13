import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import ts from "typescript";
import { emitDeclarations, outputSpecifier } from "./declarations.ts";

const fixture = (t: TestContext, files: Record<string, string>) => {
  const cwd = mkdtempSync(join(tmpdir(), "aui-declarations-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(
    join(cwd, "tsconfig.json"),
    JSON.stringify({
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
  );
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(cwd, "src", file, ".."), { recursive: true });
    writeFileSync(join(cwd, "src", file), content);
  }
  return cwd;
};

const emit = (cwd: string, entry: readonly string[]) => {
  rmSync(join(cwd, "dist"), { recursive: true, force: true });
  emitDeclarations({ cwd, entry, rootDir: "src", outDir: "dist" });
  return Object.fromEntries(
    [
      "index.d.ts",
      "index.d.ts.map",
      "dir/index.d.ts",
      "view.d.ts",
      "aug.d.ts",
    ].map((file) => [file, readFileSync(join(cwd, "dist", file), "utf8")]),
  );
};

test("outputSpecifier rewrites only relative specifiers that resolve to emitted modules", (t) => {
  const cwd = fixture(t, {
    "index.ts": "export {};",
    "named.ts": "export interface Named { name: string }",
    "dir/index.ts": "export const helper = 1;",
    "data.json": "{}",
  });
  const options: ts.CompilerOptions = {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    resolveJsonModule: true,
  };
  const importer = join(cwd, "src", "index.ts");
  const resolve = (specifier: string) =>
    outputSpecifier(specifier, importer, options, ts.sys);
  assert.equal(resolve("./named"), "./named.js");
  assert.equal(resolve("./named.js"), "./named.js");
  assert.equal(resolve("./dir"), "./dir/index.js");
  assert.equal(resolve("./data.json"), "./data.json");
  assert.equal(resolve("./missing"), "./missing");
  assert.equal(resolve("react"), "react");
  assert.equal(resolve("@assistant-ui/core/react"), "@assistant-ui/core/react");
});

test("emitDeclarations writes one deterministic declaration per entry with runtime specifiers", (t) => {
  const cwd = fixture(t, {
    "index.ts": [
      '/// <reference path="./aug.ts" preserve="true" />',
      '/// <reference types="some-ambient-types" preserve="true" />',
      'import type { Named } from "./named";',
      'import { helper, makeOther } from "./dir";',
      'export { helper } from "./dir";',
      'export * from "./view";',
      "export const named: Named = helper();",
      "export const other = makeOther();",
    ].join("\n"),
    "named.ts": "export interface Named { name: string }",
    "other.ts": "export interface Other { id: number }",
    "dir/index.ts": [
      'import type { Named } from "../named";',
      'import type { Other } from "../other";',
      'export const helper = (): Named => ({ name: "x" });',
      "export const makeOther = (): Other => ({ id: 1 });",
    ].join("\n"),
    "view.tsx": 'export const view = "view";',
    "aug.ts": "export {};",
  });
  const entry = [
    "src/aug.ts",
    "src/dir/index.ts",
    "src/index.ts",
    "src/named.ts",
    "src/other.ts",
    "src/view.tsx",
  ];
  const first = emit(cwd, entry);
  const index = first["index.d.ts"]!;
  assert.ok(
    index.startsWith(
      [
        '/// <reference path="aug.d.ts" preserve="true" />',
        '/// <reference types="some-ambient-types" preserve="true" />',
        "",
      ].join("\n"),
    ),
  );
  assert.match(index, /from "\.\/named\.js"/);
  assert.match(index, /from "\.\/dir\/index\.js"/);
  assert.match(index, /export \* from "\.\/view\.js"/);
  assert.match(index, /import\("\.\/other\.js"\)\.Other/);
  assert.match(first["dir/index.d.ts"]!, /from "\.\.\/named\.js"/);
  assert.deepEqual(JSON.parse(first["index.d.ts.map"]!).sources, [
    "../src/index.ts",
  ]);
  assert.deepEqual(emit(cwd, entry), first);
});

const BASE64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Generated line and column to source line and column, per the source map v3
// encoding.
const decodeMappings = (mappings: string) => {
  const segments: number[][] = [];
  const state = [0, 0, 0, 0];
  mappings.split(";").forEach((line, generatedLine) => {
    let generatedColumn = 0;
    for (const segment of line.split(",").filter(Boolean)) {
      const fields: number[] = [];
      let value = 0;
      let shift = 0;
      for (const char of segment) {
        const digit = BASE64.indexOf(char);
        value += (digit & 31) << shift;
        shift += 5;
        if (digit & 32) continue;
        fields.push(value & 1 ? -(value >>> 1) : value >>> 1);
        value = 0;
        shift = 0;
      }
      generatedColumn += fields[0]!;
      if (fields.length < 4) continue;
      state[1]! += fields[2]!;
      state[2]! += fields[3]!;
      segments.push([generatedLine, generatedColumn, state[1]!, state[2]!]);
    }
  });
  return segments;
};

test("emitDeclarations keeps the declaration map aligned after rewriting a specifier", (t) => {
  const cwd = fixture(t, {
    "other.ts": "export interface Other { id: number }",
    "make.ts": [
      'import type { Other } from "./other";',
      "export const makeOther = (): Other => ({ id: 1 });",
    ].join("\n"),
    "index.ts": [
      'import { makeOther } from "./make";',
      "export function pair(first = makeOther(), second = 1) {",
      "  return [first, second] as const;",
      "}",
    ].join("\n"),
  });
  emitDeclarations({
    cwd,
    entry: ["src/index.ts", "src/make.ts", "src/other.ts"],
    rootDir: "src",
    outDir: "dist",
  });
  const declaration = readFileSync(join(cwd, "dist", "index.d.ts"), "utf8");
  const map = JSON.parse(
    readFileSync(join(cwd, "dist", "index.d.ts.map"), "utf8"),
  ) as { mappings: string };
  const source = readFileSync(join(cwd, "src", "index.ts"), "utf8").split("\n");

  const lines = declaration.split("\n");
  const line = lines.findIndex((text) => text.includes("second?"));
  assert.match(lines[line]!, /import\("\.\/other\.js"\)\.Other, second\?/);
  const column = lines[line]!.indexOf("second?");
  const segment = decodeMappings(map.mappings).find(
    ([generatedLine, generatedColumn]) =>
      generatedLine === line && generatedColumn === column,
  );
  assert.ok(segment, `no mapping at ${line}:${column}`);
  assert.equal(
    source[segment[2]!]!.slice(segment[3]!, segment[3]! + "second".length),
    "second",
  );
});

test("emitDeclarations fails on a declaration the emitter cannot name", (t) => {
  const cwd = fixture(t, {
    "hidden.ts": [
      "interface Hidden { a: number }",
      "export const makeHidden = () => ({ a: 1 }) as Hidden;",
    ].join("\n"),
    "index.ts": [
      'import { makeHidden } from "./hidden";',
      "export const hidden = makeHidden();",
    ].join("\n"),
  });
  assert.throws(
    () =>
      emitDeclarations({
        cwd,
        entry: ["src/hidden.ts", "src/index.ts"],
        rootDir: "src",
        outDir: "dist",
      }),
    /TS4023/,
  );
  assert.equal(existsSync(join(cwd, "tsconfig.aui-build.json")), false);
});

test("emitDeclarations fails on a tsconfig the compiler would reject", (t) => {
  const cwd = fixture(t, { "index.ts": "export const value = 1;" });
  writeFileSync(
    join(cwd, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { moduleResolution: "nowhere" } }),
  );
  assert.throws(
    () =>
      emitDeclarations({
        cwd,
        entry: ["src/index.ts"],
        rootDir: "src",
        outDir: "dist",
      }),
    /TS5024|moduleResolution/,
  );
});

test("emitDeclarations keeps the doc comment of a function that gains properties", (t) => {
  const cwd = fixture(t, {
    "view.ts": [
      "/** Renders the view. */",
      "export function View() { return null; }",
      'View.displayName = "View";',
    ].join("\n"),
  });
  emitDeclarations({
    cwd,
    entry: ["src/view.ts"],
    rootDir: "src",
    outDir: "dist",
  });
  assert.match(
    readFileSync(join(cwd, "dist", "view.d.ts"), "utf8"),
    /\/\*\* Renders the view\. \*\/\nexport declare function View\(\)/,
  );
  assert.equal(existsSync(join(cwd, "tsconfig.aui-build.json")), false);
});

test("emitDeclarations fails on a documented constant that gains properties", (t) => {
  const cwd = fixture(t, {
    "view.ts": [
      "/** Renders the view. */",
      "export const View = () => null;",
      'View.displayName = "View";',
      "export const Plain = () => null;",
      'Plain.displayName = "Plain";',
      "/** Typed, so it stays a constant. */",
      "export const Typed: { (): null; displayName?: string } = () => null;",
      'Typed.displayName = "Typed";',
    ].join("\n"),
  });
  assert.throws(
    () =>
      emitDeclarations({
        cwd,
        entry: ["src/view.ts"],
        rootDir: "src",
        outDir: "dist",
      }),
    (error: Error) =>
      /Declare these as functions/.test(error.message) &&
      error.message.endsWith("\n  src/view.ts: View"),
  );
});

test("emitDeclarations fails on a reference directive the emitter would drop", (t) => {
  const cwd = fixture(t, {
    "aug.ts": "export {};",
    "index.ts": [
      '/// <reference path="./aug.ts" />',
      "export const value = 1;",
    ].join("\n"),
  });
  assert.throws(
    () =>
      emitDeclarations({
        cwd,
        entry: ["src/aug.ts", "src/index.ts"],
        rootDir: "src",
        outDir: "dist",
      }),
    /preserve="true"[\s\S]*src\/index\.ts: [^\n]*aug\.ts/,
  );
});
