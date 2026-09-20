import { builtinModules } from "node:module";

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

// `deps.onlyImport` visits import statements, so two shapes reach published
// declarations unchecked: an inline `import("pkg").Type`, which is a TypeScript
// import type, and a `/// <reference types="pkg" />` directive, which
// `preserveReferenceDirectives` reinjects after tsc drops it.
export const undeclaredTypeReferences = (
  declaration: string,
  declared: readonly string[],
) => {
  const undeclared = new Set<string>();
  const code = declaration.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of code.matchAll(
    /\bimport\(\s*["']([^"']+)["']\s*\)|\/\/\/\s*<reference\s+types\s*=\s*["']([^"']+)["']/g,
  )) {
    const name = packageSpecifierName(match[1] ?? match[2] ?? "");
    if (!name || name.startsWith(".") || declared.includes(name)) continue;
    undeclared.add(name);
  }
  return undeclared;
};
