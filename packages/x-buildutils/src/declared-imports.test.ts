import assert from "node:assert/strict";
import test from "node:test";
import {
  declaredImports,
  packageSpecifierName,
  undeclaredTypeReferences,
} from "./declared-imports.ts";

test("packageSpecifierName keeps the scope and drops the subpath", () => {
  assert.equal(packageSpecifierName("hast"), "hast");
  assert.equal(
    packageSpecifierName("remark-rehype/lib/index.js"),
    "remark-rehype",
  );
  assert.equal(packageSpecifierName("@babel/core/lib/index.js"), "@babel/core");
  assert.equal(packageSpecifierName("node:fs/promises"), "node:fs");
  assert.equal(packageSpecifierName("#mcp-stdio"), "#mcp-stdio");
  assert.equal(packageSpecifierName("#internal/*"), "#internal");
});

test("declaredImports admits the runtime graph and nothing from devDependencies", () => {
  const manifest = {
    name: "@assistant-ui/fixture",
    dependencies: { "remark-rehype": "^11.0.0" },
    peerDependencies: { react: "^19.0.0" },
    optionalDependencies: { "assistant-cloud": "^0.2.0" },
    devDependencies: { vitest: "^5.0.0" },
  };
  const allowed = declaredImports(manifest);
  for (const name of [
    "@assistant-ui/fixture",
    "remark-rehype",
    "react",
    "assistant-cloud",
  ]) {
    assert.ok(allowed.includes(name), name);
  }
  assert.ok(!allowed.includes("vitest"));
});

test("a @types package also admits the module it types", () => {
  const allowed = declaredImports({
    name: "fixture",
    dependencies: { "@types/hast": "^3.0.0", "@types/babel__core": "^7.20.5" },
  });
  assert.ok(allowed.includes("@types/hast"));
  assert.ok(allowed.includes("hast"));
  assert.ok(allowed.includes("@babel/core"));
});

test("imports map keys are admitted by their specifier name", () => {
  const allowed = declaredImports({
    name: "fixture",
    imports: {
      "#mcp-stdio": { node: "./src/mcp-stdio.ts", default: "./src/stub.ts" },
      "#internal/*": "./src/internal/*.ts",
    },
  });
  assert.ok(allowed.includes("#mcp-stdio"));
  assert.ok(allowed.includes("#internal"));
});

test("node builtins are admitted in bare and node: form", () => {
  const allowed = declaredImports({ name: "fixture" });
  assert.ok(allowed.includes("fs"));
  assert.ok(allowed.includes("node:fs"));
  assert.ok(allowed.includes(packageSpecifierName("node:fs/promises")));
});

test("undeclaredTypeReferences reports import types and reference directives by package name", () => {
  const declaration = [
    '/// <reference types="node" />',
    "/// <reference types='undeclared-types' />",
    'export type A = import("declared").A;',
    'export type B = import("undeclared").B;',
    "export type C = import('@scope/undeclared/sub').C;",
    'export type D = import( "spaced" ).D;',
    'export type E = import("./local").E;',
    'export type F = import("/absolute/path").F;',
    '/* export type G = import("commented").G; */',
  ].join("\n");
  assert.deepEqual(
    undeclaredTypeReferences(declaration, ["node", "declared"]),
    new Set(["undeclared-types", "undeclared", "@scope/undeclared", "spaced"]),
  );
});

test("undeclaredTypeReferences reports the statement imports the declaration emit writes", () => {
  const declaration = [
    'import type { A } from "undeclared-type-only";',
    'import { type B } from "undeclared-inline-type";',
    'import C from "undeclared-default";',
    'export type { D } from "@scope/undeclared-reexport/sub";',
    'export * from "undeclared-star";',
    'import "undeclared-side-effect";',
    "import type {",
    "  E,",
    '} from "undeclared-multiline";',
    'declare module "declared" {',
    '  import type { H } from "undeclared-nested";',
    "}",
    'import type { F } from "declared";',
    'import type { G } from "./local";',
    // A template interpolation is code, so a type-level import inside one is a
    // real dependency rather than literal text.
    'export type Hole = `${import("undeclared-in-a-hole").Name}`;',
    "import undeclaredEquals = require('undeclared-equals');",
    // A comment that ends mid-line must not swallow the statement after it.
    "/*",
    "import X",
    '*/ import type { I } from "undeclared-after-a-comment";',
  ].join("\n");
  assert.deepEqual(
    undeclaredTypeReferences(declaration, ["declared"]),
    new Set([
      "undeclared-type-only",
      "undeclared-inline-type",
      "undeclared-default",
      "@scope/undeclared-reexport",
      "undeclared-star",
      "undeclared-side-effect",
      "undeclared-multiline",
      "undeclared-nested",
      "undeclared-in-a-hole",
      "undeclared-equals",
      "undeclared-after-a-comment",
    ]),
  );
});

test("undeclaredTypeReferences does not read a specifier out of ordinary declaration syntax", () => {
  const declaration = [
    'export type Range = { from: "a"; to: "b" };',
    'export declare const label: "imported from \\"elsewhere\\"";',
    'export type Keys = "from" | "import";',
    // A statement spelled inside a string, a line comment or a template
    // literal type names no module the package has to declare.
    `export declare const marker: "import type X from 'in-a-string'";`,
    '// import { X } from "in-a-comment";',
    'export type Spelled = `import x from "in-a-template"`;',
    'export declare const inline: "import(\\"in-a-string\\").T";',
    '// export type Ref = import("in-a-comment").T;',
    "export type Snippet = `",
    'import X from "across-a-template"',
    'export * from "also-across-a-template"',
    "`;",
    '/* import { Y } from "in-a-block-comment"; */',
  ].join("\n");
  assert.deepEqual(undeclaredTypeReferences(declaration, []), new Set());
});
