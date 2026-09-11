import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeBundledDeclaration,
  selectStaleSurfaceFiles,
} from "./generate-api-surface.mjs";

const attachmentUnion = (first, second) =>
  `type X = (${first}) | (${second});\n`;

const completeMember = (source) =>
  `{ status: CompleteAttachmentStatus; content: ThreadUserMessagePart[] } & { source: "${source}" }`;

const pendingMember = (source) =>
  `{ status: PendingAttachmentStatus; file: File } & { source: "${source}" }`;

const statusOrder = (output) => [
  output.indexOf("CompleteAttachmentStatus"),
  output.indexOf("PendingAttachmentStatus"),
];

test("attachment union normalizes thread-composer members to Complete-first", () => {
  const pendingFirst = normalizeBundledDeclaration(
    attachmentUnion(
      pendingMember("thread-composer"),
      completeMember("thread-composer"),
    ),
  );
  const completeFirst = normalizeBundledDeclaration(
    attachmentUnion(
      completeMember("thread-composer"),
      pendingMember("thread-composer"),
    ),
  );

  const [complete, pending] = statusOrder(pendingFirst);
  assert.ok(complete >= 0 && pending >= 0);
  assert.ok(complete < pending);
  assert.equal(pendingFirst, completeFirst);
});

test("attachment union normalizes edit-composer members to Complete-first", () => {
  const [complete, pending] = statusOrder(
    normalizeBundledDeclaration(
      attachmentUnion(
        pendingMember("edit-composer"),
        completeMember("edit-composer"),
      ),
    ),
  );
  assert.ok(complete < pending);
});

test("string literal unions are sorted into a canonical order", () => {
  const output = normalizeBundledDeclaration(
    `type Role = "user" | "system" | "assistant";\n`,
  );
  assert.match(output, /"assistant"\s*\|\s*"system"\s*\|\s*"user"/);
});

test("normalization is idempotent", () => {
  const once = normalizeBundledDeclaration(
    attachmentUnion(
      pendingMember("thread-composer"),
      completeMember("thread-composer"),
    ),
  );
  assert.equal(normalizeBundledDeclaration(once), once);
});

test("top-level statements are grouped and sorted by name", () => {
  const output = normalizeBundledDeclaration(
    [
      `type Zebra = string;`,
      `import { Second } from "second";`,
      `declare function alpha(a: string): void;`,
      `import { First } from "first";`,
      `interface Middle { a: 1; }`,
      `export { Middle, Zebra, alpha };`,
      `declare function alpha(a: number): void;`,
    ].join("\n"),
  );

  const order = [
    `import { First } from "first";`,
    `import { Second } from "second";`,
    "interface Middle",
    "type Zebra",
    "alpha(a: string)",
    "alpha(a: number)",
    "export { Middle, Zebra, alpha };",
  ].map((snippet) => output.indexOf(snippet));

  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
  );
});

test("removing an unused React default import leaves no blank gap", () => {
  const output = normalizeBundledDeclaration(
    `import { A } from "a";\nimport React from "react";\ntype B = string;\nexport { B };\n`,
  );
  assert.ok(!output.includes(`import React`));
  assert.ok(!output.includes("\n\n\n"));
});

test("statement sorting is idempotent", () => {
  const once = normalizeBundledDeclaration(
    `type Beta = 1;\n\ntype Alpha = 2;\n\nexport { Alpha, Beta };\n`,
  );
  assert.equal(normalizeBundledDeclaration(once), once);
});

test("an unrecognized composer attachment union shape throws", () => {
  const bad = attachmentUnion(
    `{ status: CompleteAttachmentStatus } & { source: "thread-composer" }`,
    `{ status: PendingAttachmentStatus } & { source: "thread-composer" }`,
  );
  assert.throws(() => normalizeBundledDeclaration(bad), /unsupported shape/);
});

test("private instance members collapse to a single #private identity marker", () => {
  const disposed = normalizeBundledDeclaration(
    [
      "declare class Foo {",
      "  private disposed;",
      "  constructor(options?: Options);",
      "  listThreads(): void;",
      "}",
      "export { Foo };",
    ].join("\n"),
  );
  const generation = normalizeBundledDeclaration(
    [
      "declare class Foo {",
      "  #private;",
      "  private generation;",
      "  constructor(options?: Options);",
      "  listThreads(): void;",
      "}",
      "export { Foo };",
    ].join("\n"),
  );

  assert.equal(disposed, generation);
  assert.match(disposed, /#private;/);
  assert.equal(disposed.includes("disposed"), false);
  assert.equal(disposed.includes("generation"), false);
  assert.match(disposed, /constructor\(options\?: Options\)/);
  assert.match(disposed, /listThreads\(\): void/);
});

test("a class with no private members does not gain a #private marker", () => {
  const output = normalizeBundledDeclaration(
    [
      "declare class Foo {",
      "  constructor();",
      "  listThreads(): void;",
      "}",
      "export { Foo };",
    ].join("\n"),
  );
  assert.equal(output.includes("#private"), false);
});

test("private constructors stay in the surface", () => {
  const output = normalizeBundledDeclaration(
    "declare class Foo {\n  private constructor();\n}\nexport { Foo };\n",
  );
  assert.match(output, /private constructor\(\)/);
});

test("private constructor parameter fields become ordinary parameters", () => {
  const output = normalizeBundledDeclaration(
    [
      "declare class Foo {",
      "  constructor(private readonly name: string);",
      "}",
      "export { Foo };",
    ].join("\n"),
  );
  assert.match(output, /constructor\(name: string\)/);
  assert.equal(output.includes("private name"), false);
});

test("private static members do not add an instance #private brand", () => {
  const output = normalizeBundledDeclaration(
    [
      "declare class Foo {",
      "  private static notifyListeners(): void;",
      "  static get(): Foo;",
      "}",
      "export { Foo };",
    ].join("\n"),
  );
  assert.equal(output.includes("#private"), false);
  assert.equal(output.includes("notifyListeners"), false);
  assert.match(output, /static get\(\): Foo/);
});

test("protected members stay in the surface", () => {
  const output = normalizeBundledDeclaration(
    [
      "declare class Foo {",
      "  protected render(): void;",
      "  private hide(): void;",
      "}",
      "export { Foo };",
    ].join("\n"),
  );
  assert.match(output, /protected render\(\): void/);
  assert.match(output, /#private;/);
  assert.equal(output.includes("hide"), false);
});

test("stale surface selection flags files for no current package under any filter", () => {
  const files = [
    "api-surface/a.ts",
    "api-surface/gone.ts",
    "api-surface/readme.md",
  ];
  const generatedFiles = new Set(["api-surface/a.ts"]);
  const knownFiles = new Set(["api-surface/a.ts", "api-surface/b.ts"]);

  assert.deepEqual(
    selectStaleSurfaceFiles({
      files,
      generatedFiles,
      knownFiles,
      filtered: true,
    }),
    ["api-surface/gone.ts"],
  );
});

test("a filtered run leaves files for unselected-but-existing packages alone", () => {
  const files = ["api-surface/a.ts", "api-surface/b.ts"];
  const generatedFiles = new Set(["api-surface/a.ts"]);
  const knownFiles = new Set(["api-surface/a.ts", "api-surface/b.ts"]);

  assert.deepEqual(
    selectStaleSurfaceFiles({
      files,
      generatedFiles,
      knownFiles,
      filtered: true,
    }),
    [],
  );
});

test("an unfiltered run treats not-regenerated files as stale", () => {
  const files = ["api-surface/a.ts", "api-surface/b.ts", "api-surface/gone.ts"];
  const generatedFiles = new Set(["api-surface/a.ts"]);
  const knownFiles = new Set(["api-surface/a.ts", "api-surface/b.ts"]);

  assert.deepEqual(
    selectStaleSurfaceFiles({
      files,
      generatedFiles,
      knownFiles,
      filtered: false,
    }),
    ["api-surface/b.ts", "api-surface/gone.ts"],
  );
});
