import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { createExtensionTransformer } from "./extension-transformer";

interface FixtureOptions {
  entry: string;
  files?: Record<string, string>;
  rewriteNamespaceExports?: boolean;
  validExportsMap?: Map<string, Set<string>>;
}

const emitFixture = async ({
  entry,
  files = {},
  rewriteNamespaceExports,
  validExportsMap,
}: FixtureOptions): Promise<string> => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "aui-buildutils-"));

  try {
    const srcDir = path.join(tempDir, "src");
    const outDir = path.join(tempDir, "dist");
    const entryPath = path.join(srcDir, "index.ts");

    await mkdir(srcDir, { recursive: true });
    await writeFile(entryPath, entry);

    const programFiles = [entryPath];
    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(srcDir, relPath);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content);
      programFiles.push(fullPath);
    }

    const program = ts.createProgram(programFiles, {
      declaration: false,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: false,
      outDir,
      rootDir: srcDir,
      sourceMap: false,
      target: ts.ScriptTarget.ESNext,
    });

    const output = new Map<string, string>();
    const transformerOptions: {
      validExportsMap?: Map<string, Set<string>>;
      rewriteNamespaceExports?: boolean;
    } = {};
    if (rewriteNamespaceExports !== undefined)
      transformerOptions.rewriteNamespaceExports = rewriteNamespaceExports;
    if (validExportsMap !== undefined)
      transformerOptions.validExportsMap = validExportsMap;
    const transformer = createExtensionTransformer(program, transformerOptions);

    const emitResult = program.emit(
      undefined,
      (fileName, text) => {
        output.set(path.relative(outDir, fileName), text);
      },
      undefined,
      false,
      { before: [transformer] },
    );

    expect(emitResult.emitSkipped).toBe(false);
    return output.get("index.js")!;
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
};

const emitDeclarationFixture = async ({
  entry,
  files = {},
  validExportsMap,
}: {
  entry: string;
  files?: Record<string, string>;
  validExportsMap: Map<string, Set<string>>;
}): Promise<string> => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "aui-buildutils-"));

  try {
    const srcDir = path.join(tempDir, "src");
    const outDir = path.join(tempDir, "dist");
    const entryPath = path.join(srcDir, "index.ts");

    await mkdir(srcDir, { recursive: true });
    await writeFile(entryPath, entry);

    const programFiles = [entryPath];
    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(srcDir, relPath);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content);
      programFiles.push(fullPath);
    }

    const program = ts.createProgram(programFiles, {
      declaration: true,
      emitDeclarationOnly: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: false,
      outDir,
      rootDir: srcDir,
      sourceMap: false,
      target: ts.ScriptTarget.ESNext,
    });

    const output = new Map<string, string>();
    const declarationTransformer = createExtensionTransformer(program, {
      validExportsMap,
    });

    const emitResult = program.emit(
      undefined,
      (fileName, text) => {
        output.set(path.relative(outDir, fileName), text);
      },
      undefined,
      false,
      {
        afterDeclarations: [
          declarationTransformer as unknown as ts.TransformerFactory<
            ts.Bundle | ts.SourceFile
          >,
        ],
      },
    );

    expect(emitResult.emitSkipped).toBe(false);
    return output.get("index.d.ts")!;
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
};

describe("createExtensionTransformer", () => {
  // ─── relative specifier → .js extension ─────────────────────────

  describe("relative specifier rewriting", () => {
    it("adds .js to extensionless relative imports", async () => {
      const output = await emitFixture({
        entry: [
          'import { helper } from "./utils";',
          "console.log(helper);",
        ].join("\n"),
        files: { "utils.ts": "export const helper = 1;\n" },
      });
      expect(output).toContain('from "./utils.js"');
    });

    it("resolves directory imports to /index.js", async () => {
      const output = await emitFixture({
        entry: [
          'import { Root } from "./primitives/message";',
          "console.log(Root);",
        ].join("\n"),
        files: {
          "primitives/message/index.ts": 'export const Root = "root";\n',
        },
      });
      expect(output).toContain('from "./primitives/message/index.js"');
    });

    it("preserves existing .js extension", async () => {
      const output = await emitFixture({
        entry: [
          'import { helper } from "./utils.js";',
          "console.log(helper);",
        ].join("\n"),
        files: { "utils.ts": "export const helper = 1;\n" },
      });
      expect(output).toContain('from "./utils.js"');
      expect(output).not.toContain(".js.js");
    });

    it("preserves .mjs extension", async () => {
      const output = await emitFixture({
        entry: 'export { x } from "./foo.mjs";\n',
      });
      expect(output).toContain('from "./foo.mjs"');
      expect(output).not.toContain(".mjs.js");
    });

    it("preserves .cjs extension", async () => {
      const output = await emitFixture({
        entry: 'export { x } from "./foo.cjs";\n',
      });
      expect(output).toContain('from "./foo.cjs"');
      expect(output).not.toContain(".cjs.js");
    });

    it("preserves .json extension", async () => {
      const output = await emitFixture({
        entry: 'export { default } from "./data.json";\n',
      });
      expect(output).toContain('from "./data.json"');
      expect(output).not.toContain(".json.js");
    });

    it("does not rewrite bare specifiers", async () => {
      const output = await emitFixture({
        entry: ['import React from "react";', "console.log(React);"].join("\n"),
      });
      expect(output).toContain('from "react"');
      expect(output).not.toContain('from "react.js"');
    });
  });

  // ─── export declarations ─────────────────────────────────────────

  describe("export declaration rewriting", () => {
    it("adds .js to named re-exports", async () => {
      const output = await emitFixture({
        entry: 'export { helper } from "./utils";\n',
        files: { "utils.ts": "export const helper = 1;\n" },
      });
      expect(output).toContain('from "./utils.js"');
    });

    it("adds .js to star re-exports", async () => {
      const output = await emitFixture({
        entry: 'export * from "./utils";\n',
        files: { "utils.ts": "export const helper = 1;\n" },
      });
      expect(output).toContain('from "./utils.js"');
    });
  });

  // ─── dynamic import() ────────────────────────────────────────────

  describe("dynamic import() rewriting", () => {
    it("adds .js to dynamic import()", async () => {
      const output = await emitFixture({
        entry: 'const mod = import("./utils");\n',
        files: { "utils.ts": "export const helper = 1;\n" },
      });
      expect(output).toContain('import("./utils.js")');
    });
  });

  // ─── namespace re-export splitting ───────────────────────────────

  describe("namespace re-export rewriting", () => {
    const nsFiles = {
      "primitives/message/index.ts": 'export const Root = "root";\n',
    };

    it("splits into import + named export when enabled", async () => {
      const output = await emitFixture({
        entry: 'export * as MessagePrimitive from "./primitives/message";\n',
        files: nsFiles,
        rewriteNamespaceExports: true,
      });
      expect(output).toContain(
        'import * as MessagePrimitive from "./primitives/message/index.js"',
      );
      expect(output).toContain("export { MessagePrimitive }");
      expect(output).not.toContain("export * as MessagePrimitive");
    });

    it("still rewrites extension but preserves syntax when disabled", async () => {
      const output = await emitFixture({
        entry: 'export * as MessagePrimitive from "./primitives/message";\n',
        files: nsFiles,
        rewriteNamespaceExports: false,
      });
      expect(output).toContain("./primitives/message/index.js");
      expect(output).toContain("export * as MessagePrimitive");
      expect(output).not.toContain("import * as MessagePrimitive");
    });

    it("does not split type-only namespace re-exports", async () => {
      const output = await emitFixture({
        entry:
          'export type * as MessagePrimitive from "./primitives/message";\n',
        files: nsFiles,
        rewriteNamespaceExports: true,
      });
      // Type-only export should not become a runtime import + export
      expect(output).not.toContain("import * as MessagePrimitive");
    });

    it("defaults to disabled when option is omitted", async () => {
      const output = await emitFixture({
        entry: 'export * as MessagePrimitive from "./primitives/message";\n',
        files: nsFiles,
      });
      expect(output).toContain("export * as MessagePrimitive");
      expect(output).not.toContain("import * as MessagePrimitive");
    });
  });

  // ─── package sub-path rewriting (validExportsMap) ────────────────

  describe("package sub-path rewriting (validExportsMap)", () => {
    const validExportsMap = new Map([
      ["@foo/bar", new Set([".", "./public"])],
      ["lodash", new Set(["."])],
    ]);

    it("rewrites invalid scoped sub-path to root package", async () => {
      const output = await emitFixture({
        entry: [
          'import { X } from "@foo/bar/internal/thing";',
          "console.log(X);",
        ].join("\n"),
        validExportsMap,
      });
      expect(output).toContain('from "@foo/bar"');
      expect(output).not.toContain("internal/thing");
    });

    it("preserves valid scoped sub-path", async () => {
      const output = await emitFixture({
        entry: ['import { X } from "@foo/bar/public";', "console.log(X);"].join(
          "\n",
        ),
        validExportsMap,
      });
      expect(output).toContain('from "@foo/bar/public"');
    });

    it("rewrites invalid unscoped sub-path to root package", async () => {
      const output = await emitFixture({
        entry: ['import get from "lodash/get";', "console.log(get);"].join(
          "\n",
        ),
        validExportsMap,
      });
      expect(output).toContain('from "lodash"');
      expect(output).not.toContain("lodash/get");
    });

    it("does not rewrite root-level package imports", async () => {
      const output = await emitFixture({
        entry: ['import _ from "@foo/bar";', "console.log(_);"].join("\n"),
        validExportsMap,
      });
      expect(output).toContain('from "@foo/bar"');
    });

    it("ignores packages not in the map", async () => {
      const output = await emitFixture({
        entry: ['import { X } from "unknown-pkg/sub";', "console.log(X);"].join(
          "\n",
        ),
        validExportsMap,
      });
      expect(output).toContain('from "unknown-pkg/sub"');
    });

    it("applies to export declarations", async () => {
      const output = await emitFixture({
        entry: 'export { X } from "@foo/bar/internal/thing";\n',
        validExportsMap,
      });
      expect(output).toContain('from "@foo/bar"');
    });

    it("applies to dynamic imports", async () => {
      const output = await emitFixture({
        entry: 'const mod = import("@foo/bar/internal/thing");\n',
        validExportsMap,
      });
      expect(output).toContain('import("@foo/bar")');
    });
  });

  // ─── import type node rewriting in .d.ts (afterDeclarations) ─────

  describe("import type node rewriting in .d.ts", () => {
    const validExportsMap = new Map([["@foo/bar", new Set([".", "./public"])]]);

    it("rewrites invalid sub-path in import() type expressions", async () => {
      const output = await emitDeclarationFixture({
        entry:
          'export declare const thing: import("@foo/bar/internal/types").Thing;\n',
        validExportsMap,
      });
      expect(output).toContain('import("@foo/bar").Thing');
      expect(output).not.toContain("internal/types");
    });

    it("preserves valid sub-path in import() type expressions", async () => {
      const output = await emitDeclarationFixture({
        entry: 'export declare const thing: import("@foo/bar/public").Thing;\n',
        validExportsMap,
      });
      expect(output).toContain('import("@foo/bar/public").Thing');
    });
  });

  // ─── no-op ───────────────────────────────────────────────────────

  describe("no-op behavior", () => {
    it("emits unchanged output when there are no imports or exports", async () => {
      const output = await emitFixture({
        entry: "const x = 1;\nconsole.log(x);\n",
      });
      expect(output).toContain("const x = 1");
      expect(output).not.toContain("from ");
    });
  });
});
