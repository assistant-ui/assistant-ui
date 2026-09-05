#!/usr/bin/env node

// Validates the `@deprecated Experimental since ...` annotations that mark
// experimental API. Every declaration named with an experimental prefix is
// checked in place rather than by name, so a name that already exists annotated
// in another package cannot vouch for a new unannotated one. Expiry is driven
// by the calendar, so this runs unfiltered on every pull request: a window
// closes with the clock rather than with a diff.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { optionValues } from "./lib/script-options.mjs";
import {
  EXPERIMENTAL_BOILERPLATE,
  EXPERIMENTAL_PREFIX_PATTERN,
  EXPERIMENTAL_WINDOW_DAYS,
  STALE_AFTER_DAYS,
  addDays,
  parseDeprecatedTag,
  reviewDate,
  today,
} from "./lib/experimental-annotations.mjs";

const requireFromBuildUtils = createRequire(
  path.join(process.cwd(), "packages/x-buildutils/package.json"),
);
const ts = requireFromBuildUtils("typescript");

const SOURCE_FILE = /\.(?:ts|tsx|mts|cts)$/;
const TEST_FILE = /(?:\.test\.|\.bench\.|[\\/]__tests__[\\/])/;

// The wordings this grammar replaces. A removal notice on an experimental
// symbol is legitimate; describing the experiment itself in free prose is what
// the grammar exists to stop coming back.
const LEGACY_EXPERIMENTAL_PROSE =
  /\b(?:experimental|unstable|under active development|may change|might change)\b/i;

export function collectSourceFiles(root) {
  let packages;
  try {
    packages = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return packages
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const src = path.join(root, entry.name, "src");
      try {
        if (!statSync(src).isDirectory()) return [];
      } catch {
        return [];
      }
      return readdirSync(src, { recursive: true })
        .map((file) => path.join(src, String(file)))
        .filter((file) => SOURCE_FILE.test(file) && !TEST_FILE.test(file));
    })
    .sort();
}

function isDeclaration(node) {
  return (
    ts.isPropertySignature(node) ||
    ts.isMethodSignature(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isVariableDeclaration(node) ||
    ts.isPropertyDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isEnumMember(node)
  );
}

function declarationName(node) {
  const name = node.name;
  if (!name) return undefined;
  return ts.isIdentifier(name) || ts.isStringLiteral(name)
    ? name.text
    : undefined;
}

// JSDoc attaches to the statement, not to the declarator inside it, so a
// `const` carries its comment on the enclosing VariableStatement.
function documentable(node) {
  let current = node;
  while (
    current.parent &&
    (ts.isVariableDeclarationList(current.parent) ||
      ts.isVariableStatement(current.parent))
  ) {
    current = current.parent;
  }
  return current;
}

function deprecatedText(node) {
  for (const doc of documentable(node).jsDoc ?? []) {
    for (const tag of doc.tags ?? []) {
      if (tag.tagName.text !== "deprecated") continue;
      const comment = ts.getTextOfJSDocComment(tag.comment) ?? "";
      return comment.replace(/\s+/g, " ").trim();
    }
  }
  return undefined;
}

// An experimental name reached through a re-export resolves to the declaration
// that carries the annotation, so a specifier is never required to repeat it.
export function collectDeclarations(file, source) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declarations = [];
  const visit = (node) => {
    if (isDeclaration(node)) {
      const name = declarationName(node);
      if (name) {
        const text = deprecatedText(node);
        if (EXPERIMENTAL_PREFIX_PATTERN.test(name) || text !== undefined) {
          declarations.push({
            name,
            deprecated: text,
            line:
              sourceFile.getLineAndCharacterOfPosition(
                node.getStart(sourceFile, false),
              ).line + 1,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return declarations;
}

export function checkSource({ file, source, now, windowDays, staleAfterDays }) {
  const errors = [];
  const warnings = [];
  const misnamed = [];
  for (const declaration of collectDeclarations(file, source)) {
    const { name, deprecated, line } = declaration;
    const prefixed = EXPERIMENTAL_PREFIX_PATTERN.test(name);
    const where = `${file}:${line} (${name})`;

    if (deprecated === undefined) {
      if (prefixed) {
        errors.push(
          `${where}: experimental API with no @deprecated annotation.`,
        );
      }
      continue;
    }

    const record = parseDeprecatedTag(deprecated);
    if (record.kind === "invalid") {
      errors.push(`${where}: ${record.reason}`);
      continue;
    }
    // An experimental API on its way out carries an ordinary deprecation
    // instead: the two are successive states of one lifecycle, not separate
    // axes, so a removal notice replaces the experimental window.
    if (record.kind !== "experimental") {
      if (prefixed && LEGACY_EXPERIMENTAL_PROSE.test(record.prose ?? "")) {
        errors.push(
          `${where}: describes an experimental API in free prose; use "Experimental since <date>. ${EXPERIMENTAL_BOILERPLATE}".`,
        );
      }
      continue;
    }

    if (!prefixed) misnamed.push(where);

    const review = reviewDate(record, windowDays);
    if (review < now) {
      errors.push(
        `${where}: experimental window closed ${review}. Graduate it, remove it, or append ", extended <date>" to the tag.`,
      );
      continue;
    }
    if (record.extended.length >= 2) {
      warnings.push({
        symbol: name,
        detail: `extended ${record.extended.length} times, shipped ${record.since}`,
      });
    } else if (addDays(record.since, staleAfterDays) < now) {
      warnings.push({
        symbol: name,
        detail: `experimental since ${record.since}, review ${review}`,
      });
    }
  }
  return { errors, warnings, misnamed };
}

function main() {
  const args = process.argv.slice(2);
  const now = optionValues(args, "--today")[0] ?? today();
  const repoRoot = process.cwd();
  const files = collectSourceFiles(path.join(repoRoot, "packages"));

  const errors = [];
  const warnings = [];
  const misnamed = [];
  for (const file of files) {
    const result = checkSource({
      file: path.relative(repoRoot, file).replaceAll("\\", "/"),
      source: readFileSync(file, "utf8"),
      now,
      windowDays: EXPERIMENTAL_WINDOW_DAYS,
      staleAfterDays: STALE_AFTER_DAYS,
    });
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    misnamed.push(...result.misnamed);
  }

  // One symbol declared across several interfaces warns once, with a site
  // count, so the list stays a worklist rather than a wall.
  const bySymbol = new Map();
  for (const warning of warnings) {
    const existing = bySymbol.get(warning.symbol);
    if (existing) existing.sites += 1;
    else bySymbol.set(warning.symbol, { ...warning, sites: 1 });
  }
  if (bySymbol.size > 0) {
    console.warn(`Experimental API past its first review (${bySymbol.size}):`);
    for (const [symbol, warning] of [...bySymbol].sort()) {
      const sites = warning.sites > 1 ? ` (${warning.sites} sites)` : "";
      console.warn(`  ${symbol}: ${warning.detail}${sites}`);
    }
    console.warn("");
  }
  if (misnamed.length > 0) {
    console.warn(`Experimental but not named unstable_ (${misnamed.length}):`);
    for (const where of misnamed) console.warn(`  ${where}`);
    console.warn("");
  }
  if (errors.length > 0) {
    console.error(`Experimental annotation errors (${errors.length}):`);
    for (const error of errors) console.error(`  ${error}`);
    console.error("");
    console.error(
      `Annotate experimental API as "@deprecated Experimental since <YYYY-MM-DD>. ${EXPERIMENTAL_BOILERPLATE}"`,
    );
    process.exit(1);
  }
  console.log(`Checked ${files.length} source file(s).`);
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main();
}
