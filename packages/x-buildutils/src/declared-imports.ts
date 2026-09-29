import { builtinModules } from "node:module";
import ts from "typescript";

type Manifest = {
  name: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  imports?: Record<string, unknown>;
};

export const packageSpecifierName = (specifier: string) =>
  specifier
    .split("/")
    .slice(0, specifier.startsWith("@") ? 2 : 1)
    .join("/");

// An import the manifest does not declare cannot be resolved by a consumer, so
// the emitted output may only import what the package depends on. tsdown
// matches `deps.onlyImport` against the package name, exempts node builtins
// only on `platform: "node"`, and knows nothing of the bare module a
// `@types/*` package stands in for.
export const declaredImports = (pkg: Manifest) => {
  const declared = Object.keys({
    ...pkg.dependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies,
  });
  return [
    pkg.name,
    ...declared,
    ...declared
      .filter((name) => name.startsWith("@types/"))
      .map((name) => {
        const bare = name.slice("@types/".length);
        return bare.includes("__") ? `@${bare.replace("__", "/")}` : bare;
      }),
    ...Object.keys(pkg.imports ?? {}).map(packageSpecifierName),
    ...builtinModules.flatMap((name) => [name, `node:${name}`]),
  ];
};

// `deps.onlyImport` is matched against the rolldown JS build, where the
// TypeScript transform has already erased every `import type`, so three shapes
// reach published declarations unchecked: an inline `import("pkg").Type`, a
// `/// <reference types="pkg" />` directive the declaration emit keeps when the
// source marks it `preserve="true"`, and the statement-level
// `import type { X } from "pkg"` that the declaration emit writes for any
// type-only import the source used.
// A specifier is read from the parsed declaration rather than matched in its
// text. `deps.onlyImport` is matched against the rolldown JS build, where the
// TypeScript transform has already erased every `import type`, so declarations
// are the only place the type-only graph is visible: statement imports and
// re-exports, inline `import("pkg")` types, `import x = require("pkg")`, and
// the `/// <reference types="pkg" />` directives the emit keeps when the source
// marks them `preserve="true"`.
export const undeclaredTypeReferences = (
  declaration: string,
  declared: readonly string[],
) => {
  const undeclared = new Set<string>();
  const source = ts.createSourceFile(
    "declaration.d.ts",
    declaration,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );

  const add = (specifier: string | undefined) => {
    const name = packageSpecifierName(specifier ?? "");
    if (!name || name.startsWith(".") || declared.includes(name)) return;
    undeclared.add(name);
  };
  const literalText = (node: ts.Node | undefined) =>
    node && ts.isStringLiteralLike(node) ? node.text : undefined;

  for (const directive of source.typeReferenceDirectives) {
    add(directive.fileName);
  }

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(literalText(node.moduleSpecifier));
    } else if (ts.isImportTypeNode(node)) {
      if (ts.isLiteralTypeNode(node.argument)) {
        add(literalText(node.argument.literal));
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(literalText(node.moduleReference.expression));
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      add(literalText(node.arguments[0]));
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);

  return undeclared;
};
