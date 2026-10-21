#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { isExecutedAsMain } from "./lib/main.mjs";
import { readPackageDirectories } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const ts = createRequire(
  path.join(repoRoot, "packages/x-buildutils/package.json"),
)("typescript");
const SHIM = "@assistant-ui/tap/react-shim";
const SOURCES = new Set(["react", SHIM, "@assistant-ui/tap/standalone-shim"]);
const has = (pkg, name) =>
  Boolean(pkg.dependencies?.[name] || pkg.peerDependencies?.[name]);

export function namedImports(source, file = "input.js") {
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const imports = [];
  for (const statement of parsed.statements) {
    if (
      (!ts.isImportDeclaration(statement) &&
        !ts.isExportDeclaration(statement)) ||
      !statement.moduleSpecifier ||
      !SOURCES.has(statement.moduleSpecifier.text)
    )
      continue;
    const bindings = ts.isImportDeclaration(statement)
      ? statement.importClause?.namedBindings
      : statement.exportClause;
    if (
      !bindings ||
      (!ts.isNamedImports(bindings) && !ts.isNamedExports(bindings))
    )
      continue;
    for (const element of bindings.elements)
      imports.push((element.propertyName ?? element.name).text);
  }
  return imports;
}

export function namedExports(source, file = "shim.js") {
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const exports = new Set();
  for (const statement of parsed.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements)
        exports.add(element.name.text);
    } else if (
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    ) {
      if (statement.name) exports.add(statement.name.text);
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name))
            exports.add(declaration.name.text);
        }
      }
    }
  }
  return exports;
}

export function missingShimImports(file, source, exports) {
  return [...new Set(namedImports(source, file))]
    .filter((name) => !exports.has(name))
    .map((name) => ({ file, name }));
}

export function routesReactToShim(pkg) {
  return pkg.name === "@assistant-ui/tap" || has(pkg, "@assistant-ui/tap");
}

function* jsFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* jsFiles(file);
    else if (entry.isFile() && /\.[cm]?js$/.test(entry.name)) yield file;
  }
}

export function runCheck(root = repoRoot) {
  const shimFile = path.join(
    root,
    "packages/tap/dist/standalone-shim/index.js",
  );
  // CI builds only the packages a change touches and their dependents, so an
  // unbuilt package is one this change cannot have broken.
  if (!existsSync(shimFile)) return { failures: [], scanned: 0, skipped: [] };
  const exports = namedExports(readFileSync(shimFile, "utf8"), shimFile);
  if (exports.size === 0)
    throw new Error(`No standalone shim exports found in ${shimFile}`);
  const packages = new Map();
  for (const { packageDir, pkg } of readPackageDirectories(root)) {
    packages.set(pkg.name, { pkg, packageDir });
  }
  const queue = [...packages.values()]
    .filter(({ pkg }) => has(pkg, "@assistant-ui/tap") && !has(pkg, "react"))
    .map(({ pkg }) => pkg.name);
  const reachable = new Set(queue);
  for (const name of queue) {
    const { pkg } = packages.get(name);
    for (const dependency of Object.keys({
      ...pkg.dependencies,
      ...pkg.peerDependencies,
    })) {
      if (packages.has(dependency) && !reachable.has(dependency)) {
        reachable.add(dependency);
        queue.push(dependency);
      }
    }
  }
  const failures = [];
  const skipped = [];
  let scanned = 0;
  for (const name of [...reachable].sort()) {
    const { pkg, packageDir } = packages.get(name);
    if (!routesReactToShim(pkg)) continue;
    const dist = path.join(packageDir, "dist");
    if (!existsSync(dist) || !statSync(dist).isDirectory()) {
      skipped.push(name);
      continue;
    }
    const files = [...jsFiles(dist)];
    if (files.length === 0) throw new Error(`No built JavaScript in ${dist}`);
    for (const file of files) {
      scanned++;
      failures.push(
        ...missingShimImports(
          path.relative(root, file),
          readFileSync(file, "utf8"),
          exports,
        ),
      );
    }
  }
  return { failures, scanned, skipped };
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  try {
    const { failures, scanned, skipped } = runCheck(
      process.argv[2] ?? repoRoot,
    );
    if (failures.length) {
      for (const { file, name } of failures)
        console.error(
          `${file}: named import ${name} is absent from the standalone shim`,
        );
      process.exitCode = 1;
    } else
      console.log(
        `Standalone shim imports resolve. (${scanned} built files scanned${skipped.length ? `; skipped unbuilt: ${skipped.join(", ")}` : ""})`,
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
