#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./lib/main.mjs";
import { optionValues } from "./lib/script-options.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const ts = createRequire(
  path.join(repoRoot, "packages/x-buildutils/package.json"),
)("typescript");
const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: true,
});

function sorted(values) {
  return [...values].sort();
}

function normalizedPrint(node, sourceFile) {
  const printed = printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    printed,
  );
  const tokens = [];
  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
    tokens.push(scanner.getTokenText());
  }
  return tokens.join(" ");
}

function declarationNames(statement) {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .filter((declaration) => ts.isIdentifier(declaration.name))
      .map((declaration) => declaration.name.text);
  }
  if (
    (ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isModuleDeclaration(statement)) &&
    statement.name &&
    ts.isIdentifier(statement.name)
  ) {
    return [statement.name.text];
  }
  return [];
}

function parseSurface(text) {
  const entries = new Map();
  const namespaces = new Map();
  const declarations = new Map();
  const imports = new Map();
  if (text === null) return { entries, declarations, imports };

  const fileName = path.join(repoRoot, "__api_surface_diff__.ts");
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const options = { noLib: true, noResolve: true };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name) => (name === fileName ? source : undefined);
  const checker = ts.createProgram([fileName], options, host).getTypeChecker();
  const symbols = new Map();
  function bind(identifier) {
    const symbol = checker.getSymbolAtLocation(identifier);
    if (symbol) symbols.set(symbol, identifier.text);
  }
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const module = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (clause?.name) {
        imports.set(clause.name.text, module);
        bind(clause.name);
      }
      if (clause?.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) {
          imports.set(clause.namedBindings.name.text, module);
          bind(clause.namedBindings.name);
        } else {
          for (const specifier of clause.namedBindings.elements) {
            imports.set(specifier.name.text, module);
            bind(specifier.name);
          }
        }
      }
    } else if (ts.isImportEqualsDeclaration(statement)) {
      imports.set(
        statement.name.text,
        normalizedPrint(statement.moduleReference, source),
      );
      bind(statement.name);
    } else if (
      ts.isModuleDeclaration(statement) &&
      ts.isIdentifier(statement.name) &&
      ts.isModuleBlock(statement.body)
    ) {
      const exports = new Map();
      for (const member of statement.body.statements) {
        if (
          !ts.isExportDeclaration(member) ||
          !member.exportClause ||
          !ts.isNamedExports(member.exportClause)
        )
          continue;
        for (const specifier of member.exportClause.elements) {
          exports.set(
            specifier.name.text,
            (specifier.propertyName ?? specifier.name).text,
          );
        }
      }
      namespaces.set(statement.name.text, exports);
    } else if (
      ts.isExportDeclaration(statement) &&
      !statement.moduleSpecifier &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const specifier of statement.exportClause.elements) {
        if (specifier.name.text.startsWith("entry_")) {
          entries.set(
            specifier.name.text,
            (specifier.propertyName ?? specifier.name).text,
          );
        }
      }
    }

    for (const name of declarationNames(statement)) {
      const group = declarations.get(name) ?? [];
      group.push({ node: statement, text: normalizedPrint(statement, source) });
      declarations.set(name, group);
      const identifier = ts.isVariableStatement(statement)
        ? statement.declarationList.declarations.find(
            (declaration) =>
              ts.isIdentifier(declaration.name) &&
              declaration.name.text === name,
          )?.name
        : statement.name;
      if (identifier && ts.isIdentifier(identifier)) bind(identifier);
    }
  }

  for (const [name, namespace] of entries)
    entries.set(name, namespaces.get(namespace) ?? new Map());
  for (const group of declarations.values()) {
    for (const declaration of group) {
      const references = new Set();
      function visit(node) {
        if (ts.isIdentifier(node)) {
          const name = symbols.get(checker.getSymbolAtLocation(node));
          if (name) references.add(name);
        }
        ts.forEachChild(node, visit);
      }
      visit(declaration.node);
      declaration.references = references;
    }
  }
  return { entries, declarations, imports };
}

function closure(surface, name) {
  const pending = [name];
  const visited = new Set();
  const texts = [];
  const imports = new Set();
  while (pending.length) {
    const current = pending.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    if (surface.imports.has(current)) {
      imports.add(JSON.stringify([current, surface.imports.get(current)]));
    }
    for (const declaration of surface.declarations.get(current) ?? []) {
      texts.push(declaration.text);
      for (const reference of declaration.references) {
        if (
          surface.declarations.has(reference) ||
          surface.imports.has(reference)
        ) {
          pending.push(reference);
        }
      }
    }
  }
  return JSON.stringify([sorted(texts), sorted(imports)]);
}

export function diffApiSurface(baseText, headText) {
  const base = parseSurface(baseText);
  const head = parseSurface(headText);
  const entriesAdded = sorted(
    [...head.entries.keys()].filter((entry) => !base.entries.has(entry)),
  );
  const entriesRemoved = sorted(
    [...base.entries.keys()].filter((entry) => !head.entries.has(entry)),
  );
  const exportsAdded = {};
  const exportsRemoved = {};
  const declarationsChanged = [];

  for (const entry of sorted(
    new Set([...base.entries.keys(), ...head.entries.keys()]),
  )) {
    const before = base.entries.get(entry) ?? new Map();
    const after = head.entries.get(entry) ?? new Map();
    const added = sorted([...after.keys()].filter((name) => !before.has(name)));
    const removed = sorted(
      [...before.keys()].filter((name) => !after.has(name)),
    );
    if (added.length) exportsAdded[entry] = added;
    if (removed.length) exportsRemoved[entry] = removed;
    for (const name of sorted(
      [...before.keys()].filter((name) => after.has(name)),
    )) {
      if (closure(base, before.get(name)) !== closure(head, after.get(name))) {
        declarationsChanged.push({ entry, name });
      }
    }
  }

  return {
    entriesAdded,
    entriesRemoved,
    exportsAdded,
    exportsRemoved,
    declarationsChanged,
    changed: Boolean(
      entriesAdded.length ||
      entriesRemoved.length ||
      Object.keys(exportsAdded).length ||
      Object.keys(exportsRemoved).length ||
      declarationsChanged.length,
    ),
  };
}

function exportsObject(value) {
  if (typeof value === "string") return { ".": value };
  return value && typeof value === "object" ? value : {};
}

export function diffExportsMap(baseExports, headExports) {
  const base = exportsObject(baseExports);
  const head = exportsObject(headExports);
  return {
    added: sorted(Object.keys(head).filter((key) => !Object.hasOwn(base, key))),
    removed: sorted(
      Object.keys(base).filter((key) => !Object.hasOwn(head, key)),
    ),
    changed: sorted(
      Object.keys(base).filter(
        (key) =>
          Object.hasOwn(head, key) &&
          JSON.stringify(base[key]) !== JSON.stringify(head[key]),
      ),
    ),
  };
}

function git(args, allowMissing = false) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (allowMissing) return null;
    throw new Error(result.stderr.trim() || `git ${args[0]} failed`);
  }
  return result.stdout;
}

function main() {
  const args = process.argv.slice(2);
  const bases = optionValues(args, "--base");
  const heads = optionValues(args, "--head");
  if (bases.length !== 1 || heads.length > 1 || !bases[0] || heads[0] === "") {
    throw new Error(
      "Usage: node scripts/diff-api-surface.mjs --base <ref> [--head <ref>]",
    );
  }
  const base = bases[0];
  const head = heads[0] ?? "HEAD";
  git(["rev-parse", "--verify", `${base}^{commit}`]);
  git(["rev-parse", "--verify", `${head}^{commit}`]);
  const files = git([
    "diff",
    "--name-only",
    "--no-renames",
    "-z",
    `${base}...${head}`,
    "--",
    "api-surface",
    "packages",
  ])
    .split("\0")
    .filter(Boolean)
    .sort();
  const apiSurface = [];
  const exports = [];
  for (const file of files) {
    if (/^api-surface\/[^/]+\.ts$/.test(file)) {
      apiSurface.push({
        file,
        diff: diffApiSurface(
          git(["show", `${base}:${file}`], true),
          git(["show", `${head}:${file}`], true),
        ),
      });
    } else if (/^packages\/[^/]+\/package\.json$/.test(file)) {
      const before = git(["show", `${base}:${file}`], true);
      const after = git(["show", `${head}:${file}`], true);
      const diff = diffExportsMap(
        before === null ? null : JSON.parse(before).exports,
        after === null ? null : JSON.parse(after).exports,
      );
      if (diff.added.length || diff.removed.length || diff.changed.length) {
        exports.push({ path: file, diff });
      }
    }
  }
  process.stdout.write(`${JSON.stringify({ apiSurface, exports })}\n`);
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) main();
