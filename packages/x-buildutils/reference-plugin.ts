import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { glob } from "tinyglobby";
import type { RsbuildPlugin } from "@rslib/core";

const TYPE_ONLY_RE = /^export\s*\{\s*\}\s*;?\s*$/;

function jsified(spec: string): string | null {
  if (!spec.startsWith("./") && !spec.startsWith("../")) return null;
  if (/\.[a-z]+$/i.test(spec)) return null;
  return `${spec}.js`;
}

function rewriteDtsExtensions(content: string, filename: string): string {
  const sf = ts.createSourceFile(
    filename,
    content,
    ts.ScriptTarget.ESNext,
    true,
  );

  const transformer: ts.TransformerFactory<ts.SourceFile> = (ctx) => {
    const { factory } = ctx;

    const visit: ts.Visitor = (node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const rewritten = jsified(node.moduleSpecifier.text);
        if (rewritten)
          return factory.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            factory.createStringLiteral(rewritten),
            node.attributes,
          );
      }

      if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const rewritten = jsified(node.moduleSpecifier.text);
        if (rewritten)
          return factory.updateExportDeclaration(
            node,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            factory.createStringLiteral(rewritten),
            node.attributes,
          );
      }

      if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      ) {
        const rewritten = jsified(node.argument.literal.text);
        if (rewritten)
          return factory.updateImportTypeNode(
            node,
            factory.createLiteralTypeNode(
              factory.createStringLiteral(rewritten),
            ),
            node.attributes,
            node.qualifier,
            node.typeArguments,
            node.isTypeOf,
          );
      }

      return ts.visitEachChild(node, visit, ctx);
    };

    return (node) => ts.visitNode(node, visit) as ts.SourceFile;
  };

  const result = ts.transform(sf, [transformer]);
  const output = ts
    .createPrinter({ newLine: ts.NewLineKind.LineFeed })
    .printFile(result.transformed[0]!);
  result.dispose();
  return output;
}

async function addJsExtensionsToDts(file: string): Promise<void> {
  const content = await fs.readFile(file, "utf-8");
  const updated = rewriteDtsExtensions(content, file);
  if (updated !== content) await fs.writeFile(file, updated);
}

// tsc drops /// <reference> directives from declaration emit — microsoft/TypeScript#9714
async function restoreReferenceDirectives(srcFile: string): Promise<void> {
  const content = await fs.readFile(srcFile, "utf-8");
  const sf = ts.createSourceFile(
    srcFile,
    content,
    ts.ScriptTarget.ESNext,
    false,
  );

  const directives = [
    ...sf.referencedFiles.map(
      (r) =>
        `/// <reference path="${r.fileName.replace(/\.tsx?$/, ".d.ts")}" />`,
    ),
    ...sf.typeReferenceDirectives.map(
      (r) => `/// <reference types="${r.fileName}" />`,
    ),
  ];
  if (directives.length === 0) return;

  const dtsPath = srcFile
    .replace(/^src\//, "dist/")
    .replace(/\.tsx?$/, ".d.ts");
  try {
    const dtsContent = await fs.readFile(dtsPath, "utf-8");
    if (!dtsContent.startsWith("/// <reference"))
      await fs.writeFile(dtsPath, `${directives.join("\n")}\n${dtsContent}`);
  } catch {
    // .d.ts may not exist for test-only source files
  }
}

function buildModuleSourceLookup(compilation: any): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const mod of compilation.modules) {
    const resource: unknown = mod.resource;
    if (typeof resource !== "string") continue;
    const raw = mod.originalSource?.()?.source?.();
    if (raw == null) continue;
    lookup.set(
      resource,
      Buffer.isBuffer(raw) ? raw.toString("utf-8") : String(raw),
    );
  }
  return lookup;
}

export function referencePlugin(): RsbuildPlugin {
  return {
    name: "aui-emit-reference-plugin",
    enforce: "post",
    setup(api) {
      // rspack skips source maps for type-only stubs — emit them from the module graph
      api.processAssets(
        { stage: "optimize-inline" },
        ({ assets, compiler, compilation }) => {
          const { RawSource } = compiler.webpack.sources;
          const moduleSources = buildModuleSourceLookup(compilation);

          for (const [filename] of Object.entries(assets)) {
            if (!filename.endsWith(".js")) continue;
            if (compilation.getAsset(`${filename}.map`)) continue;

            const assetSource = compilation.getAsset(filename)?.source;
            if (!assetSource) continue;

            const content = assetSource.source();
            if (typeof content !== "string") continue;
            if (!TYPE_ONLY_RE.test(content.trim())) continue;

            // asset names are relative to outputDir, not cwd
            const absTs = path.resolve("src", filename.replace(/\.js$/, ".ts"));
            const srcContent =
              moduleSources.get(absTs) ??
              moduleSources.get(absTs.replace(/\.ts$/, ".tsx")) ??
              "";

            const mapName = `${path.basename(filename)}.map`;
            const sourceRef = path.relative(
              path.dirname(path.resolve("dist", filename)),
              absTs,
            );

            compilation.emitAsset(
              `${filename}.map`,
              new RawSource(
                JSON.stringify({
                  version: 3,
                  file: path.basename(filename),
                  sourceRoot: "",
                  sources: [sourceRef],
                  names: [],
                  mappings: "",
                  sourcesContent: [srcContent],
                }),
              ),
            );
            compilation.updateAsset(
              filename,
              new RawSource(
                `${content.trimEnd()}\n//# sourceMappingURL=${mapName}\n`,
              ),
            );
          }
        },
      );

      // dts files are written by tsc outside rspack's pipeline
      api.onAfterBuild(async () => {
        const [dtsFiles, srcFiles] = await Promise.all([
          glob(["dist/**/*.d.ts"]),
          glob([
            "src/**/*.{ts,tsx}",
            "!src/**/__tests__/**",
            "!src/**/*.test.{ts,tsx}",
          ]),
        ]);

        await Promise.all([
          ...dtsFiles.map(addJsExtensionsToDts),
          ...srcFiles.map(restoreReferenceDirectives),
        ]);
      });
    },
  };
}
