import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = resolve(__dirname, "..");
const DIST_DIR = resolve(SRC_DIR, "../dist");
const ENTRY_FILES = [
  resolve(__dirname, "index.ts"),
  resolve(__dirname, "compiler-runtime.ts"),
];
const DIST_ENTRY_FILES = [
  resolve(DIST_DIR, "standalone-shim/index.js"),
  resolve(DIST_DIR, "standalone-shim/compiler-runtime.js"),
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
  it("keeps runtime react imports and the react-shim out of the source graph", () => {
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
        if (reference.typeOnly) continue;
        if (
          reference.specifier !== "react" &&
          !reference.specifier.startsWith("react/")
        ) {
          continue;
        }
        violations.push(
          `${relative(SRC_DIR, file)} imports "${reference.specifier}"`,
        );
      }
    }

    expect(
      violations,
      `aui-build rewrites every emitted bare react import to the react-shim, which imports real react. ` +
        `A runtime react import anywhere in the shim's graph therefore breaks the published react-free entry:\n` +
        violations.map((v) => `  - ${v}`).join("\n"),
    ).toEqual([]);

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

  it.skipIf(!existsSync(DIST_ENTRY_FILES[0]!))(
    "keeps the built dist graph free of react and the react-shim",
    () => {
      const visited = new Set<string>();
      const pending = [...DIST_ENTRY_FILES];
      const violations: string[] = [];

      while (pending.length > 0) {
        const file = pending.pop()!;
        if (visited.has(file)) continue;
        visited.add(file);

        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(
          /(?:from\s+|import\s+)["']([^"']+)["']/g,
        )) {
          const specifier = match[1]!;
          if (
            specifier === "react" ||
            specifier.startsWith("react/") ||
            specifier.includes("react-shim")
          ) {
            violations.push(`${relative(DIST_DIR, file)} -> ${specifier}`);
            continue;
          }
          if (specifier.startsWith(".")) {
            pending.push(resolve(dirname(file), specifier));
          }
        }
      }

      expect(
        violations,
        `The published standalone entries must resolve without react installed. aui-build rewrites bare react imports to the react-shim, so any react usage in a module reachable from the standalone shim reintroduces the dependency:\n` +
          violations.map((v) => `  - ${v}`).join("\n"),
      ).toEqual([]);
    },
  );
});
