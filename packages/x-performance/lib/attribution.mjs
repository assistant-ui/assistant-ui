import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { REF_PACKAGE_DIRS } from "./ref-packages.mjs";

const MEASURED = Object.keys(REF_PACKAGE_DIRS);

const packageOf = (specifier) =>
  MEASURED.find(
    (name) => specifier === name || specifier.startsWith(`${name}/`),
  );

// Benches reach measured packages only through bare public specifiers, so a
// static scan of import sources lists everything a bench file exercises; a
// relative import would hide a dependency from the scan and is rejected.
// Statement-level type imports are erased at runtime and skipped;
// side-effect imports and runtime re-exports count.
export const importedPackages = (source) => {
  const out = new Set();
  const pattern =
    /^\s*(?:import|export)\s+(type\s+)?[^"';]*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/gm;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) continue;
    const specifier = match[2] ?? match[3] ?? match[4] ?? "";
    if (specifier.startsWith(".")) {
      throw new Error(
        `bench files import public package entries only, found ${specifier}`,
      );
    }
    const pkg = packageOf(specifier);
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
  const walk = (dir) => {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((x, y) =>
      x.name.localeCompare(y.name),
    );
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.bench\.tsx?$/.test(entry.name)) {
        const source = readFileSync(path, "utf8");
        out.set(
          `bench/${relative(benchDir, path)}`,
          closure(importedPackages(source), graph),
        );
      }
    }
  };
  walk(benchDir);
  return out;
};

export const benchFileOf = (rowId) => rowId.slice(0, rowId.indexOf(" > "));

export const attributeRows = (rows, coverage, changed) =>
  rows.map((row) => {
    const file = benchFileOf(row.id);
    const covers = coverage.get(file);
    if (!covers) {
      throw new Error(
        `no coverage entry for ${file}: bench ids must start with the bench file path`,
      );
    }
    const touched = changed.filter((pkg) => covers.has(pkg));
    return { ...row, measured: touched.length > 0, touched };
  });
