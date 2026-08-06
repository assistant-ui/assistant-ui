import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = resolve(__dirname, "..");
const ENTRY_FILES = [
  resolve(__dirname, "index.ts"),
  resolve(__dirname, "compiler-runtime.ts"),
];
const REACT_SHIM_DIR = resolve(SRC_DIR, "react-shim");
const ALLOWED_REACT_HOOK_NAMES = [
  "default",
  "createContext",
  "use",
  "useCallback",
  "useContext",
  "useDebugValue",
  "useEffect",
  "useEffectEvent",
  "useInsertionEffect",
  "useLayoutEffect",
  "useMemo",
  "useReducer",
  "useRef",
  "useState",
  "useSyncExternalStore",
] as const;

type ModuleReference = {
  clause: string | null;
  specifier: string;
  typeOnly: boolean;
};

const readModuleReferences = (source: string): ModuleReference[] => {
  const references: ModuleReference[] = [];
  const fromPattern =
    /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(\{[\s\S]*?\}|\*\s+as\s+\w+|\*|\w+(?:\s*,\s*(?:\{[\s\S]*?\}|\*\s+as\s+\w+))?)\s+from\s+["']([^"']+)["']/g;
  const sideEffectPattern = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;

  for (const match of source.matchAll(fromPattern)) {
    references.push({
      clause: match[2]!,
      specifier: match[3]!,
      typeOnly: match[1] !== undefined,
    });
  }

  for (const match of source.matchAll(sideEffectPattern)) {
    references.push({
      clause: null,
      specifier: match[1]!,
      typeOnly: false,
    });
  }

  return references;
};

const resolveRelativeModule = (importer: string, specifier: string) => {
  const base = resolve(dirname(importer), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  const resolved = candidates.find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );

  if (!resolved) {
    throw new Error(
      `Could not resolve ${specifier} imported by ${relative(SRC_DIR, importer)}.`,
    );
  }

  return resolved;
};

const getRuntimeImportNames = (clause: string | null): string[] => {
  if (clause === null) return ["*"];

  const trimmed = clause.trim();
  if (trimmed === "*" || trimmed.startsWith("* as ")) return ["*"];

  const namedStart = trimmed.indexOf("{");
  const names: string[] = [];

  if (namedStart !== 0) {
    names.push("default");
  }

  if (namedStart === -1) return names;

  const named = trimmed.slice(namedStart + 1, trimmed.lastIndexOf("}"));
  for (const part of named.split(",")) {
    const name = part.trim();
    if (!name || name.startsWith("type ")) continue;
    names.push(name.split(/\s+as\s+/)[0]!);
  }

  return names;
};

const walkImportGraph = () => {
  const graph = new Map<string, ModuleReference[]>();
  const pending = [...ENTRY_FILES];

  while (pending.length > 0) {
    const file = pending.pop()!;
    if (graph.has(file)) continue;

    const references = readModuleReferences(readFileSync(file, "utf8"));
    graph.set(file, references);

    for (const reference of references) {
      if (!reference.specifier.startsWith(".")) continue;
      pending.push(resolveRelativeModule(file, reference.specifier));
    }
  }

  return graph;
};

describe("@assistant-ui/tap/standalone-shim import graph", () => {
  it("stays within the standalone-compatible React surface", () => {
    const graph = walkImportGraph();
    const reactShimModules = [...graph.keys()]
      .filter(
        (file) =>
          file === REACT_SHIM_DIR || file.startsWith(`${REACT_SHIM_DIR}/`),
      )
      .map((file) => relative(SRC_DIR, file));

    expect(reactShimModules).toEqual([]);

    const violations: string[] = [];
    for (const [file, references] of graph) {
      for (const reference of references) {
        if (reference.specifier !== "react" || reference.typeOnly) continue;

        const unsupported = getRuntimeImportNames(reference.clause).filter(
          (name) =>
            !ALLOWED_REACT_HOOK_NAMES.includes(
              name as (typeof ALLOWED_REACT_HOOK_NAMES)[number],
            ),
        );
        if (unsupported.length > 0) {
          violations.push(
            `${relative(SRC_DIR, file)}: ${unsupported.join(", ")}`,
          );
        }
      }
    }

    expect(violations).toEqual([]);

    const indexSource = readFileSync(ENTRY_FILES[0]!, "utf8");
    const exportedSurface = [
      ...indexSource.matchAll(/export const (\w+)/g),
    ].map((match) => match[1]!);
    if (/export default \w+/.test(indexSource)) exportedSurface.push("default");

    expect([...ALLOWED_REACT_HOOK_NAMES].sort()).toEqual(
      exportedSurface.sort(),
    );
  });

  it("imports React nowhere in the entry files", () => {
    for (const entry of ENTRY_FILES) {
      const reactImports = readModuleReferences(
        readFileSync(entry, "utf8"),
      ).filter(
        (reference) =>
          reference.specifier === "react" ||
          reference.specifier.startsWith("react/"),
      );

      expect(reactImports, relative(SRC_DIR, entry)).toEqual([]);
    }
  });
});
