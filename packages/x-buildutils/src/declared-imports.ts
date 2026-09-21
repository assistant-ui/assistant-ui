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

// `deps.onlyImport` is matched against the rolldown JS build, where the
// TypeScript transform has already erased every `import type`, so three shapes
// reach published declarations unchecked: an inline `import("pkg").Type`, a
// `/// <reference types="pkg" />` directive the declaration emit keeps when the
// source marks it `preserve="true"`, and the statement-level
// `import type { X } from "pkg"` that the declaration emit writes for any
// type-only import the source used.
// The statement patterns anchor to the start of a line and stop at the first
// quote, semicolon or backtick, so a specifier is only read out of a real
// statement and never out of a line comment, a string literal or a template
// literal type that happens to spell one.
const SPECIFIER_PATTERNS = [
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /\/\/\/\s*<reference\s+types\s*=\s*["']([^"']+)["']/g,
  /^\s*(?:import|export)\b[^"';`]*?\bfrom\s*["']([^"']+)["']/gm,
  /^\s*import\s+["']([^"']+)["']/gm,
];

export const undeclaredTypeReferences = (
  declaration: string,
  declared: readonly string[],
) => {
  const undeclared = new Set<string>();
  const code = declaration.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const pattern of SPECIFIER_PATTERNS) {
    for (const match of code.matchAll(pattern)) {
      const name = packageSpecifierName(match[1] ?? "");
      if (!name || name.startsWith(".") || declared.includes(name)) continue;
      undeclared.add(name);
    }
  }
  return undeclared;
};
