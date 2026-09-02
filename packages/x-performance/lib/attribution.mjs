import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REF_PACKAGE_DIRS } from "./ref-packages.mjs";

const MEASURED = Object.keys(REF_PACKAGE_DIRS);

const packageOf = (specifier) =>
  MEASURED.find(
    (name) => specifier === name || specifier.startsWith(`${name}/`),
  );

// Benches reach measured packages only through bare public specifiers, so a
// static scan of import sources lists everything a bench file exercises
// directly.
export const importedPackages = (source) => {
  const out = new Set();
  const pattern = /from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of source.matchAll(pattern)) {
    const pkg = packageOf(match[1] ?? match[2] ?? "");
    if (pkg) out.add(pkg);
  }
  return out;
};

export const workspaceGraph = (root) => {
  const graph = new Map();
  for (const [name, dir] of Object.entries(REF_PACKAGE_DIRS)) {
    const pkg = JSON.parse(
      readFileSync(join(root, dir, "package.json"), "utf8"),
    );
    const edges = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ].filter((dep) => dep in REF_PACKAGE_DIRS);
    graph.set(name, edges);
  }
  return graph;
};

export const closure = (names, graph) => {
  const seen = new Set();
  const stack = [...names];
  while (stack.length) {
    const name = stack.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    stack.push(...(graph.get(name) ?? []));
  }
  return seen;
};

// Maps each bench file, keyed the way row ids are prefixed, to the measured
// packages it exercises directly or through their workspace dependencies.
export const benchCoverage = (benchDir, graph) => {
  const out = new Map();
  for (const name of readdirSync(benchDir).sort()) {
    if (!/\.bench\.tsx?$/.test(name)) continue;
    const source = readFileSync(join(benchDir, name), "utf8");
    out.set(`bench/${name}`, closure(importedPackages(source), graph));
  }
  return out;
};

export const benchFileOf = (rowId) => rowId.slice(0, rowId.indexOf(" > "));

export const attributeRows = (rows, coverage, changed) =>
  rows.map((row) => {
    const covers = coverage.get(benchFileOf(row.id)) ?? new Set();
    const touched = changed.filter((pkg) => covers.has(pkg));
    return { ...row, measured: touched.length > 0, touched };
  });
