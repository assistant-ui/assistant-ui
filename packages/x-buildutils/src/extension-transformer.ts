import ts from "typescript";
import path from "node:path";

/**
 * "@assistant-ui/core/types/attachment"
 *   → { packageName: "@assistant-ui/core", subpath: "./types/attachment" }
 */
function parsePackageName(
  specifier: string,
): { packageName: string; subpath: string } | null {
  if (specifier.startsWith(".") || specifier.startsWith("/")) return null;

  const parts = specifier.split("/");
  let packageName: string;
  let rest: string[];

  if (specifier.startsWith("@")) {
    if (parts.length < 2) return null;
    packageName = `${parts[0]}/${parts[1]}`;
    rest = parts.slice(2);
  } else {
    packageName = parts[0]!;
    rest = parts.slice(1);
  }

  const subpath = rest.length > 0 ? `./${rest.join("/")}` : ".";
  return { packageName, subpath };
}

/**
 * Returns the root package name if the specifier is an invalid sub-path
 * of a known dependency; null otherwise (no rewrite needed).
 *
 * Wildcard exports (e.g. "./*") are intentionally NOT treated as valid —
 * they only exist to prevent TS2742 during declaration emit. The
 * transformer rewrites these back to the root specifier.
 */
function rewritePackageSubpath(
  specifier: string,
  validExportsMap: Map<string, Set<string>>,
): string | null {
  const parsed = parsePackageName(specifier);
  if (!parsed || parsed.subpath === ".") return null;

  const validPaths = validExportsMap.get(parsed.packageName);
  if (!validPaths) return null;

  if (validPaths.has(parsed.subpath)) return null;

  return parsed.packageName;
}

/**
 * TypeScript AST transformer for import specifier rewriting.
 *
 * 1. Rewrites extensionless relative imports to `.js` (both JS and .d.ts).
 * 2. When `validExportsMap` is provided (afterDeclarations only), rewrites
 *    non-public package sub-path references to the root specifier — fixing
 *    TS2742 ("inferred type cannot be named") in emitted declarations.
 */
export function createExtensionTransformer(
  program: ts.Program,
  transformerOptions?: {
    validExportsMap?: Map<string, Set<string>>;
    rewriteNamespaceExports?: boolean;
  },
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const { factory } = context;
    const compilerOptions = program.getCompilerOptions();
    const validExportsMap = transformerOptions?.validExportsMap;
    const rewriteNamespaceExports =
      transformerOptions?.rewriteNamespaceExports ?? false;

    const rewriteRelativeSpecifier = (
      sourceFileName: string,
      specifier: string,
    ): string => {
      if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
        return specifier;
      }
      if (/\.(js|mjs|cjs|json)$/.test(specifier)) {
        return specifier;
      }

      const resolved = ts.resolveModuleName(
        specifier,
        sourceFileName,
        compilerOptions,
        ts.sys,
      );
      if (resolved.resolvedModule) {
        const base = path.basename(
          resolved.resolvedModule.resolvedFileName,
          path.extname(resolved.resolvedModule.resolvedFileName),
        );
        if (base === "index" && !specifier.endsWith("/index")) {
          return `${specifier}/index.js`;
        }
      }

      return `${specifier}.js`;
    };

    const rewriteSpecifier = (
      sourceFileName: string,
      specifier: string,
    ): string => {
      const rewrittenRelative = rewriteRelativeSpecifier(
        sourceFileName,
        specifier,
      );
      if (rewrittenRelative !== specifier) {
        return rewrittenRelative;
      }

      if (validExportsMap) {
        const rewrittenPackage = rewritePackageSubpath(
          specifier,
          validExportsMap,
        );
        if (rewrittenPackage) return rewrittenPackage;
      }

      return specifier;
    };

    const rewriteNamespaceExportDeclaration = (
      sourceFileName: string,
      node: ts.ExportDeclaration,
    ): ts.Statement[] | null => {
      if (
        !rewriteNamespaceExports ||
        node.isTypeOnly ||
        !node.moduleSpecifier ||
        !ts.isStringLiteral(node.moduleSpecifier) ||
        !node.exportClause ||
        !ts.isNamespaceExport(node.exportClause)
      ) {
        return null;
      }

      const exportedName = node.exportClause.name.text;
      const rewrittenSpecifier = rewriteSpecifier(
        sourceFileName,
        node.moduleSpecifier.text,
      );

      const importDeclaration = factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
          undefined,
          undefined,
          factory.createNamespaceImport(factory.createIdentifier(exportedName)),
        ),
        factory.createStringLiteral(rewrittenSpecifier),
        node.attributes,
      );

      const exportDeclaration = factory.createExportDeclaration(
        undefined,
        false,
        factory.createNamedExports([
          factory.createExportSpecifier(false, undefined, exportedName),
        ]),
      );

      ts.setOriginalNode(importDeclaration, node);
      ts.setOriginalNode(exportDeclaration, node);

      return [importDeclaration, exportDeclaration];
    };

    const visit = (sourceFileName: string): ts.Visitor => {
      const visitor: ts.Visitor = (node) => {
        if (
          ts.isImportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const spec = node.moduleSpecifier.text;
          const newSpec = rewriteSpecifier(sourceFileName, spec);
          if (newSpec !== spec) {
            return factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              factory.createStringLiteral(newSpec),
              node.attributes,
            );
          }
        }

        if (
          ts.isExportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const spec = node.moduleSpecifier.text;
          const newSpec = rewriteSpecifier(sourceFileName, spec);
          if (newSpec !== spec) {
            return factory.updateExportDeclaration(
              node,
              node.modifiers,
              node.isTypeOnly,
              node.exportClause,
              factory.createStringLiteral(newSpec),
              node.attributes,
            );
          }
        }

        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          node.arguments.length === 1 &&
          ts.isStringLiteral(node.arguments[0]!)
        ) {
          const arg = node.arguments[0] as ts.StringLiteral;
          const newSpec = rewriteSpecifier(sourceFileName, arg.text);
          if (newSpec !== arg.text) {
            return factory.updateCallExpression(
              node,
              node.expression,
              undefined,
              [factory.createStringLiteral(newSpec)],
            );
          }
        }

        // import("pkg/internal/path").Type in .d.ts files
        if (
          validExportsMap &&
          ts.isImportTypeNode(node) &&
          ts.isLiteralTypeNode(node.argument) &&
          ts.isStringLiteral(node.argument.literal)
        ) {
          const rewritten = rewritePackageSubpath(
            node.argument.literal.text,
            validExportsMap,
          );
          if (rewritten) {
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
        }

        return ts.visitEachChild(node, visitor, context);
      };
      return visitor;
    };

    return (sourceFile) => {
      const visitor = visit(sourceFile.fileName);
      let changed = false;

      const statements = sourceFile.statements.flatMap((statement) => {
        if (ts.isExportDeclaration(statement)) {
          const rewritten = rewriteNamespaceExportDeclaration(
            sourceFile.fileName,
            statement,
          );
          if (rewritten) {
            changed = true;
            return rewritten;
          }
        }

        const next = ts.visitNode(statement, visitor) as ts.Statement;
        if (next !== statement) changed = true;
        return [next];
      });

      if (!changed) return sourceFile;

      return factory.updateSourceFile(
        sourceFile,
        statements,
        sourceFile.isDeclarationFile,
        sourceFile.referencedFiles,
        sourceFile.typeReferenceDirectives,
        sourceFile.hasNoDefaultLib,
        sourceFile.libReferenceDirectives,
      );
    };
  };
}
