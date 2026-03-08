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
  validExportsMap?: Map<string, Set<string>>,
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const { factory } = context;
    const options = program.getCompilerOptions();

    const rewrite = (sourceFileName: string, specifier: string): string => {
      if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
        return specifier;
      }
      if (/\.(js|mjs|cjs|json)$/.test(specifier)) {
        return specifier;
      }

      const resolved = ts.resolveModuleName(
        specifier,
        sourceFileName,
        options,
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

    const visit = (sourceFileName: string): ts.Visitor => {
      const visitor: ts.Visitor = (node) => {
        if (
          ts.isImportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const spec = node.moduleSpecifier.text;
          const newSpec = rewrite(sourceFileName, spec);
          if (newSpec !== spec) {
            return factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              factory.createStringLiteral(newSpec),
              node.attributes,
            );
          }
          if (validExportsMap) {
            const rewritten = rewritePackageSubpath(spec, validExportsMap);
            if (rewritten) {
              return factory.updateImportDeclaration(
                node,
                node.modifiers,
                node.importClause,
                factory.createStringLiteral(rewritten),
                node.attributes,
              );
            }
          }
        }

        if (
          ts.isExportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const spec = node.moduleSpecifier.text;
          const newSpec = rewrite(sourceFileName, spec);
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
          if (validExportsMap) {
            const rewritten = rewritePackageSubpath(spec, validExportsMap);
            if (rewritten) {
              return factory.updateExportDeclaration(
                node,
                node.modifiers,
                node.isTypeOnly,
                node.exportClause,
                factory.createStringLiteral(rewritten),
                node.attributes,
              );
            }
          }
        }

        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          node.arguments.length === 1 &&
          ts.isStringLiteral(node.arguments[0]!)
        ) {
          const arg = node.arguments[0] as ts.StringLiteral;
          const newSpec = rewrite(sourceFileName, arg.text);
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
      return ts.visitNode(
        sourceFile,
        visit(sourceFile.fileName),
      ) as ts.SourceFile;
    };
  };
}
