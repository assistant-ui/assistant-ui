/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SRC_DIR = resolve(__dirname, "..");

const FORBIDDEN_MODULES = new Set([
  "react",
  "react/jsx-runtime",
  "@assistant-ui/store",
  "@assistant-ui/tap",
]);

const STORE_ALLOWED_REACT_NAMES = new Set([
  "useState",
  "useReducer",
  "useRef",
  "useMemo",
  "useCallback",
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
  "useEffectEvent",
  "useSyncExternalStore",
  "useDebugValue",
  "use",
  "useContext",
  "createContext",
]);

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?["']([^"']+)["']/g;

const SIDE_EFFECT_IMPORT_RE = /import\s+["']([^"']+)["']/g;

const EXPORT_STAR_RE = /export\s+\*\s+from\s+["']([^"']+)["']/g;

const DYNAMIC_IMPORT_RE = /\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;

const FROM_REACT_RE =
  /(?:import|export)\s+(?:type\s+)?([\s\S]*?)\s+from\s+["']react["']/g;

function resolveRelative(fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function collectImports(content: string): string[] {
  const specs: string[] = [];
  for (const re of [
    IMPORT_RE,
    SIDE_EFFECT_IMPORT_RE,
    EXPORT_STAR_RE,
    DYNAMIC_IMPORT_RE,
  ]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      specs.push(match[1]!);
    }
  }
  return specs;
}

function walkFrom(entry: string): { forbidden: string[]; jsxFiles: string[] } {
  const visited = new Set<string>();
  const queue = [entry];
  const forbidden: string[] = [];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);

    const content = readFileSync(file, "utf-8");
    const specs = collectImports(content);

    for (const spec of specs) {
      if (FORBIDDEN_MODULES.has(spec)) {
        forbidden.push(`${relative(SRC_DIR, file)} imports "${spec}"`);
        continue;
      }
      const resolved = resolveRelative(file, spec);
      if (resolved && !visited.has(resolved)) {
        queue.push(resolved);
      }
    }
  }

  const jsxFiles = [...visited]
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => relative(SRC_DIR, file));

  return { forbidden, jsxFiles };
}

function nonTypeImportNames(clause: string): string[] {
  const names: string[] = [];
  const trimmed = clause.trim();
  if (trimmed.startsWith("type ")) return names;
  if (/^\*\s+as\s+\w+$/.test(trimmed)) return names;

  const defaultAndNamed = trimmed.match(/^(\w+)\s*,\s*\{([\s\S]*)\}$/);
  const namedOnly = trimmed.match(/^\{([\s\S]*)\}$/);
  const defaultOnly = trimmed.match(/^(\w+)$/);

  let namedBody = "";
  if (defaultAndNamed) {
    names.push(defaultAndNamed[1]!);
    namedBody = defaultAndNamed[2]!;
  } else if (namedOnly) {
    namedBody = namedOnly[1]!;
  } else if (defaultOnly) {
    names.push(defaultOnly[1]!);
    return names;
  } else {
    return names;
  }

  for (const part of namedBody.split(",")) {
    const p = part.trim();
    if (!p || p.startsWith("type ")) continue;
    const asMatch = p.match(/^(\w+)(?:\s+as\s+\w+)?$/);
    if (asMatch) names.push(asMatch[1]!);
  }
  return names;
}

describe("framework neutral boundary", () => {
  it("the default entry graph must not import react, react/jsx-runtime, @assistant-ui/tap, or @assistant-ui/store", () => {
    const { forbidden, jsxFiles } = walkFrom(resolve(SRC_DIR, "index.ts"));
    expect(
      forbidden,
      `The default entry must stay loadable without react, @assistant-ui/tap, or @assistant-ui/store installed.\n` +
        `These modules in the src/index.ts graph import a forbidden package:\n` +
        forbidden.map((f) => `  - ${f}`).join("\n"),
    ).toEqual([]);
    expect(
      jsxFiles,
      `The JSX transform injects react/jsx-runtime at build time, so the default entry graph must not contain .tsx files:\n` +
        jsxFiles.map((f) => `  - ${f}`).join("\n"),
    ).toEqual([]);
  });

  it("the internal entry graph must not import react, react/jsx-runtime, @assistant-ui/tap, or @assistant-ui/store", () => {
    const { forbidden, jsxFiles } = walkFrom(resolve(SRC_DIR, "internal.ts"));
    expect(
      forbidden,
      "The internal entry must stay loadable without react, react/jsx-runtime, @assistant-ui/tap, or @assistant-ui/store installed.\nViolations:\n" +
        forbidden.map((f) => `  - ${f}`).join("\n"),
    ).toEqual([]);
    expect(
      jsxFiles,
      `The JSX transform injects react/jsx-runtime at build time, so the internal entry graph must not contain .tsx files:\n` +
        jsxFiles.map((f) => `  - ${f}`).join("\n"),
    ).toEqual([]);
  });

  it("the store entry graphs stay hostable inside a tap root", () => {
    const violations: string[] = [];
    const jsxFiles: string[] = [];
    const visited = new Set<string>();
    const pending = [
      resolve(SRC_DIR, "store/index.ts"),
      resolve(SRC_DIR, "store/internal.ts"),
    ];

    // Walks the runtime graph only: type-only imports are erased at build, so
    // they neither carry runtime dependencies nor get traversed. This is also
    // why type imports may keep using the @assistant-ui/store barrel: the
    // augmentations target that specifier, and splitting types across entries
    // would fork the ScopeRegistry seen by src-mapped consumers.
    const RUNTIME_IMPORT_RE =
      /(?:^|\n)\s*(?:import|export)\s+(?!type\b)(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\*|\w+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?)\s+from\s+)?["']([^"']+)["']/g;

    const collectRuntimeImports = (content: string): string[] => {
      const specs: string[] = [];
      for (const re of [RUNTIME_IMPORT_RE, DYNAMIC_IMPORT_RE]) {
        re.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = re.exec(content)) !== null) {
          specs.push(match[1]!);
        }
      }
      return specs;
    };

    while (pending.length > 0) {
      const file = pending.pop()!;
      if (visited.has(file)) continue;
      visited.add(file);
      if (file.endsWith(".tsx")) jsxFiles.push(relative(SRC_DIR, file));

      const content = readFileSync(file, "utf-8");

      for (const spec of collectRuntimeImports(content)) {
        if (spec === "react/jsx-runtime") {
          violations.push(
            `${relative(SRC_DIR, file)} imports "react/jsx-runtime"`,
          );
        }
        if (spec === "@assistant-ui/store") {
          violations.push(
            `${relative(SRC_DIR, file)} value-imports the "@assistant-ui/store" barrel; use "@assistant-ui/store/client"`,
          );
        }
        const resolved = resolveRelative(file, spec);
        if (resolved && !visited.has(resolved)) {
          pending.push(resolved);
        }
      }

      FROM_REACT_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = FROM_REACT_RE.exec(content)) !== null) {
        if (/^(?:import|export)\s+type\b/.test(match[0]!)) continue;
        const clause = match[1]!;
        if (clause.trimStart().startsWith("type ")) continue;
        for (const name of nonTypeImportNames(clause)) {
          if (!STORE_ALLOWED_REACT_NAMES.has(name)) {
            violations.push(
              `${relative(SRC_DIR, file)} imports "${name}" from "react"`,
            );
          }
        }
      }
    }

    expect(
      violations,
      `The store entry graphs run inside tap roots on every framework, so they may ` +
        `only use react names the tap shim dispatches, never react/jsx-runtime, and ` +
        `never the @assistant-ui/store barrel (whose module scope requires React).\n` +
        `Violations:\n` +
        violations.map((f) => `  - ${f}`).join("\n"),
    ).toEqual([]);
    expect(
      jsxFiles,
      `The JSX transform injects react/jsx-runtime at build time, so the store entry graphs must not contain .tsx files:\n` +
        jsxFiles.map((f) => `  - ${f}`).join("\n"),
    ).toEqual([]);
  });
});
