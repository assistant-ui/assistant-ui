import ts from "typescript";
import path from "node:path";

/**
 * Creates a transformer that rewrites extensionless imports to .js
 */
export function createExtensionTransformer(
  program: ts.Program,
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const { factory } = context;
    const options = program.getCompilerOptions();

    const rewrite = (sourceFileName: string, specifier: string): string => {
      // Only rewrite relative imports without extensions
      if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
        return specifier;
      }
      if (/\.(js|mjs|cjs|json)$/.test(specifier)) {
        return specifier;
      }

      // Check if it resolves to an index file
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
        // import { foo } from "./bar"
        if (
          ts.isImportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const newSpec = rewrite(sourceFileName, node.moduleSpecifier.text);
          if (newSpec !== node.moduleSpecifier.text) {
            return factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              factory.createStringLiteral(newSpec),
              node.attributes,
            );
          }
        }

        // export { foo } from "./bar"
        if (
          ts.isExportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const newSpec = rewrite(sourceFileName, node.moduleSpecifier.text);
          if (newSpec !== node.moduleSpecifier.text) {
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

        // import("./bar")
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
