/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SRC_DIR = resolve(__dirname);

// Next.js fails the build when a module reachable from a Server Component
// names one of these React APIs in an import; the namespace import is allowed.
const CLIENT_ONLY_REACT_APIS = new Set([
  "Component",
  "PureComponent",
  "createContext",
  "createFactory",
  "useActionState",
  "useEffect",
  "useEffectEvent",
  "useImperativeHandle",
  "useInsertionEffect",
  "useLayoutEffect",
  "useOptimistic",
  "useReducer",
  "useRef",
  "useState",
  "useSyncExternalStore",
  "useTransition",
]);

const RELATIVE_SPECIFIER_RE = /\b(?:from|import)\s*\(?\s*["'](\.[^"']*)["']/g;

const NAMED_FROM_REACT_RE =
  /(?:import|export)\s+(type\s+)?(?:\w+\s*,\s*)?\{([^}]*)\}\s+from\s+["']react["']/g;

function resolveRelative(fromFile: string, spec: string): string | undefined {
  const base = resolve(dirname(fromFile), spec);
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

function collectGraph(entry: string): Set<string> {
  const visited = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    for (const [, spec] of readFileSync(file, "utf8").matchAll(
      RELATIVE_SPECIFIER_RE,
    )) {
      const resolved = resolveRelative(file, spec!);
      if (resolved) pending.push(resolved);
    }
  }
  return visited;
}

function clientOnlyReactImports(file: string): string[] {
  const names: string[] = [];
  for (const [, typeOnly, specifiers] of readFileSync(file, "utf8").matchAll(
    NAMED_FROM_REACT_RE,
  )) {
    if (typeOnly) continue;
    for (const specifier of specifiers!.split(",")) {
      const name = specifier.trim().split(/\s+as\s+/)[0]!;
      if (CLIENT_ONLY_REACT_APIS.has(name)) names.push(name);
    }
  }
  return names;
}

describe("react-server entry", () => {
  const graph = collectGraph(join(SRC_DIR, "index.server.ts"));

  it("reaches the vocabulary", () => {
    expect(graph).toContain(join(SRC_DIR, "vocabulary", "interactive.tsx"));
  });

  it("never names a client-only React API in an import", () => {
    const violations = [...graph].flatMap((file) =>
      clientOnlyReactImports(file).map(
        (name) => `${relative(SRC_DIR, file)}: ${name}`,
      ),
    );
    expect(violations).toEqual([]);
  });
});
