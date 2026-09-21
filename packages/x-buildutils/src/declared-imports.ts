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
const SPECIFIER_PATTERNS = [
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /\/\/\/\s*<reference\s+types\s*=\s*["']([^"']+)["']/g,
  /^\s*(?:import|export)\b[^"';`]*?\bfrom\s*["']([^"']+)["']/gm,
  /^\s*import\s+["']([^"']+)["']/gm,
];

// Spans whose contents are prose or data rather than code: comments, and string
// and template literals. A statement is only read when it starts outside all of
// them, so a declaration that merely spells one — in a comment, in a string, or
// across the lines of a template literal type — names no dependency. A `///`
// line is stepped over rather than masked, because the reference directive is
// itself one of the shapes being matched.
const maskedSpans = (code: string) => {
  const spans: [number, number][] = [];
  let index = 0;
  while (index < code.length) {
    const char = code[index];
    const next = code[index + 1];
    if (char === "/" && next === "/") {
      const newline = code.indexOf("\n", index);
      const end = newline === -1 ? code.length : newline;
      if (code[index + 2] !== "/") spans.push([index, end]);
      index = end;
    } else if (char === "/" && next === "*") {
      const close = code.indexOf("*/", index + 2);
      const end = close === -1 ? code.length : close + 2;
      spans.push([index, end]);
      index = end;
    } else if (char === '"' || char === "'" || char === "`") {
      let cursor = index + 1;
      while (cursor < code.length && code[cursor] !== char) {
        cursor += code[cursor] === "\\" ? 2 : 1;
      }
      const end = Math.min(cursor + 1, code.length);
      spans.push([index, end]);
      index = end;
    } else {
      index += 1;
    }
  }
  return spans;
};

export const undeclaredTypeReferences = (
  declaration: string,
  declared: readonly string[],
) => {
  const undeclared = new Set<string>();
  const spans = maskedSpans(declaration);
  const isMasked = (at: number) =>
    spans.some(([start, end]) => at >= start && at < end);
  for (const pattern of SPECIFIER_PATTERNS) {
    for (const match of declaration.matchAll(pattern)) {
      if (isMasked(match.index)) continue;
      const name = packageSpecifierName(match[1] ?? "");
      if (!name || name.startsWith(".") || declared.includes(name)) continue;
      undeclared.add(name);
    }
  }
  return undeclared;
};
