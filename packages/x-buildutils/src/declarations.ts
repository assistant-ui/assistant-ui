import { dirname, relative, resolve, sep } from "node:path";
import ts from "typescript";

const formatHost: ts.FormatDiagnosticsHost = {
  getCurrentDirectory: () => process.cwd(),
  getCanonicalFileName: (fileName) => fileName,
  getNewLine: () => "\n",
};

// A relative specifier names the emitted module beside the declaration, so
// `./x` and `./dir` become `./x.js` and `./dir/index.js`, the spelling the
// runtime output uses and the one nodenext consumers can resolve.
export const outputSpecifier = (
  specifier: string,
  importer: string,
  options: ts.CompilerOptions,
  host: ts.ModuleResolutionHost,
  cache?: ts.ModuleResolutionCache,
) => {
  if (!specifier.startsWith(".")) return specifier;
  const target = ts.resolveModuleName(specifier, importer, options, host, cache)
    .resolvedModule?.resolvedFileName;
  if (!target || !/\.tsx?$/.test(target) || target.endsWith(".d.ts")) {
    return specifier;
  }
  const output = relative(dirname(importer), target)
    .split(sep)
    .join("/")
    .replace(/\.tsx?$/, ".js");
  return output.startsWith(".") ? output : `./${output}`;
};

const rewriteRelativeSpecifiers =
  (
    options: ts.CompilerOptions,
    host: ts.CompilerHost,
  ): ts.TransformerFactory<ts.SourceFile | ts.Bundle> =>
  (context) => {
    const { factory } = context;
    const cache = ts.createModuleResolutionCache(
      host.getCurrentDirectory(),
      host.getCanonicalFileName,
      options,
    );
    const visitSourceFile = (sourceFile: ts.SourceFile) => {
      const rewrite = (literal: ts.StringLiteral) => {
        const next = outputSpecifier(
          literal.text,
          sourceFile.fileName,
          options,
          host,
          cache,
        );
        return next === literal.text
          ? literal
          : factory.createStringLiteral(next);
      };
      const visit = (node: ts.Node): ts.Node => {
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          return factory.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            rewrite(node.moduleSpecifier),
            node.attributes,
          );
        }
        if (
          ts.isExportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          return factory.updateExportDeclaration(
            node,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            rewrite(node.moduleSpecifier),
            node.attributes,
          );
        }
        if (
          ts.isImportTypeNode(node) &&
          ts.isLiteralTypeNode(node.argument) &&
          ts.isStringLiteral(node.argument.literal)
        ) {
          const argument = factory.updateLiteralTypeNode(
            node.argument,
            rewrite(node.argument.literal),
          );
          return ts.visitEachChild(
            factory.updateImportTypeNode(
              node,
              argument,
              node.attributes,
              node.qualifier,
              node.typeArguments,
              node.isTypeOf,
            ),
            visit,
            context,
          );
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitEachChild(sourceFile, visit, context);
    };
    return (node) => (ts.isSourceFile(node) ? visitSourceFile(node) : node);
  };

// One program over the sorted entry list, emitted in one pass: declaration
// text depends on the order the checker first sees each type, so a per-module
// emit scheduled by the bundler changes union order, alias visibility and
// import specifiers between builds of the same commit.
export const emitDeclarations = ({
  cwd,
  entry,
  rootDir,
  outDir,
}: {
  cwd: string;
  entry: readonly string[];
  rootDir: string;
  outDir: string;
}) => {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    resolve(cwd, "tsconfig.json"),
    undefined,
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.formatDiagnostics([diagnostic], formatHost));
      },
    },
  );
  if (!parsed)
    throw new Error(`Unable to read ${resolve(cwd, "tsconfig.json")}`);
  if (parsed.errors.length > 0) {
    throw new Error(ts.formatDiagnostics(parsed.errors, formatHost));
  }
  const options: ts.CompilerOptions = {
    ...parsed.options,
    noEmit: false,
    declaration: true,
    declarationMap: true,
    emitDeclarationOnly: true,
    rootDir: resolve(cwd, rootDir),
    outDir: resolve(cwd, outDir),
  };
  const host = ts.createCompilerHost(options, true);
  const program = ts.createProgram({
    rootNames: entry.map((file) => resolve(cwd, file)),
    options,
    host,
  });
  const { diagnostics } = program.emit(undefined, undefined, undefined, true, {
    afterDeclarations: [rewriteRelativeSpecifiers(options, host)],
  });
  const errors = diagnostics.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    throw new Error(ts.formatDiagnostics(errors, formatHost));
  }
};
