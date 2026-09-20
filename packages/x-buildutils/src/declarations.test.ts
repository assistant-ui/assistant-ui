import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";
import { emitDeclarations, outputSpecifier } from "./declarations.ts";

const fixture = (files: Record<string, string>) => {
  const cwd = mkdtempSync(join(tmpdir(), "aui-declarations-"));
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

test("outputSpecifier rewrites only relative specifiers that resolve to emitted modules", () => {
  const cwd = fixture({
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

test("emitDeclarations writes one deterministic declaration per entry with runtime specifiers", () => {
  const cwd = fixture({
    "index.ts": [
      '/// <reference path="./aug.ts" preserve="true" />',
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
    index.startsWith('/// <reference path="aug.d.ts" preserve="true" />\n'),
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

test("emitDeclarations fails on a declaration the emitter cannot name", () => {
  const cwd = fixture({
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
});
