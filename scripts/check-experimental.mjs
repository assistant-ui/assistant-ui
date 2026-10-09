#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPERIMENTAL_NAME,
  experimentalTag,
  parseDeprecatedTag,
} from "./lib/experimental-annotations.mjs";
import { isExecutedAsMain } from "./lib/main.mjs";
import { posixPath } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const ts = createRequire(
  path.join(repoRoot, "packages/x-buildutils/package.json"),
)("typescript");

const SOURCE_FILE = /\.(?:ts|tsx|mts|cts)$/;
const TEST_FILE = /\.(?:test|bench)\.|(?:^|\/)__tests__\//;

const LEGACY_WORDING =
  /^(?:unstable\b|experimental\b|under active development\b|this (?:api|feature|component|hook) is (?:still )?(?:experimental|unstable|under active development)\b)/i;

export function collectSourceFiles(root) {
  const packagesDir = path.join(root, "packages");
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const src = path.join(packagesDir, entry.name, "src");
      let files;
      try {
        files = readdirSync(src, { recursive: true });
      } catch {
        return [];
      }
      return files
        .map((file) => posixPath(path.join(src, String(file))))
        .filter((file) => SOURCE_FILE.test(file) && !TEST_FILE.test(file));
    })
    .sort();
}

function isClassMember(node) {
  return (
    (ts.isPropertyDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)) &&
    ts.isClassLike(node.parent)
  );
}

function isNamedDeclaration(node) {
  return (
    ts.isPropertySignature(node) ||
    ts.isMethodSignature(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isVariableDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isEnumMember(node) ||
    ts.isModuleDeclaration(node) ||
    isClassMember(node)
  );
}

function declarationName(node) {
  const name = node.name;
  return name && (ts.isIdentifier(name) || ts.isStringLiteral(name))
    ? name.text
    : undefined;
}

function jsDocs(node) {
  const own = node.jsDoc ?? [];
  return ts.isVariableDeclaration(node)
    ? [...(node.parent.parent.jsDoc ?? []), ...own]
    : own;
}

function deprecatedTags(node) {
  return jsDocs(node).flatMap((doc) =>
    (doc.tags ?? [])
      .filter((tag) => tag.tagName.text === "deprecated")
      .map((tag) => ts.getTextOfJSDocComment(tag.comment) ?? ""),
  );
}

function descriptions(node) {
  return jsDocs(node).map((doc) =>
    (ts.getTextOfJSDocComment(doc.comment) ?? "").replace(/\s+/g, " ").trim(),
  );
}

function insideImplementation(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isBlock(parent)) return true;
  }
  return false;
}

function scopeOf(node) {
  return ts.isVariableDeclaration(node)
    ? node.parent.parent.parent
    : node.parent;
}

function lifecycleStatus(node) {
  const tags = deprecatedTags(node);
  if (tags.length !== 1) return undefined;
  const record = parseDeprecatedTag(tags[0]);
  if (record.kind === "experimental")
    return `experimental since ${record.since}`;
  return record.kind === "deprecated" ? "deprecated" : undefined;
}

function addDays(day, days) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function checkSource({ file, source, today }) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const errors = [];
  const report = (node, name, message) => {
    const { line } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    errors.push(`${file}:${line + 1} (${name}): ${message}`);
  };

  const mergedStatus = new Map();

  const checkSite = (node, name, { required, inherits }) => {
    const tags = deprecatedTags(node);
    if (tags.length === 0) {
      if (required) {
        report(
          node,
          name,
          `experimental API without "@deprecated ${experimentalTag("<YYYY-MM-DD>")}".`,
        );
      }
      return;
    }
    if (tags.length > 1) {
      report(node, name, "carries more than one @deprecated tag.");
      return;
    }
    const record = parseDeprecatedTag(tags[0]);
    if (record.kind === "empty") {
      if (required) report(node, name, "@deprecated carries no text.");
      return;
    }
    if (record.kind === "invalid") {
      report(node, name, record.reason);
      return;
    }
    const legacy =
      record.kind === "deprecated" && LEGACY_WORDING.test(tags[0].trim());
    if (inherits && (legacy || record.kind === "experimental")) {
      report(
        node,
        name,
        "inherits the annotation of the declaration it re-exports; remove this copy.",
      );
      return;
    }
    if (record.kind === "deprecated") {
      if (legacy) {
        report(
          node,
          name,
          `describes an experimental API in free prose; use "${experimentalTag("<YYYY-MM-DD>")}".`,
        );
      }
      return;
    }
    // A date written east of UTC is already tomorrow by the UTC clock.
    if (record.since > addDays(today, 1)) {
      report(node, name, `ships in the future (${record.since}).`);
    }
    if (descriptions(node).some((text) => LEGACY_WORDING.test(text))) {
      report(
        node,
        name,
        "the description restates the stability the tag already states.",
      );
    }
  };

  const visit = (node) => {
    if (
      (node.jsDoc ?? []).some((doc) =>
        (doc.tags ?? []).some((tag) => tag.tagName.text === "experimental"),
      )
    ) {
      report(
        node,
        declarationName(
          ts.isVariableStatement(node)
            ? node.declarationList.declarations[0]
            : node,
        ) ?? "@experimental",
        "@experimental duplicates the experimental @deprecated tag; use that tag instead.",
      );
    }
    if (ts.isExportDeclaration(node) && deprecatedTags(node).length > 0) {
      report(
        node,
        "export",
        "TypeScript ignores @deprecated above an export statement; move it onto the specifier inside the braces.",
      );
    } else if (ts.isExportSpecifier(node)) {
      const exported = node.name.text;
      const local = node.propertyName?.text ?? exported;
      const renamesIntoExperimental =
        EXPERIMENTAL_NAME.test(exported) && !EXPERIMENTAL_NAME.test(local);
      checkSite(node, exported, {
        required: renamesIntoExperimental,
        inherits: !renamesIntoExperimental,
      });
    } else if (isNamedDeclaration(node)) {
      const name = declarationName(node);
      if (name !== undefined && insideImplementation(node)) {
        if (
          deprecatedTags(node).some(
            (tag) => parseDeprecatedTag(tag).kind === "experimental",
          )
        ) {
          report(
            node,
            name,
            "a declaration inside an implementation is not API; remove the tag.",
          );
        }
      } else if (name !== undefined) {
        const required = EXPERIMENTAL_NAME.test(name);
        checkSite(node, name, { required, inherits: false });
        const status = required && lifecycleStatus(node);
        if (status) {
          const scope = mergedStatus.get(scopeOf(node)) ?? new Map();
          mergedStatus.set(scopeOf(node), scope);
          const merged = scope.get(name);
          if (merged === undefined) {
            scope.set(name, status);
          } else if (merged !== status) {
            report(
              node,
              name,
              "carries a different @deprecated than another declaration merged under this name.",
            );
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return errors;
}

export function runCheck({
  root = repoRoot,
  today = new Date().toISOString().slice(0, 10),
} = {}) {
  const files = collectSourceFiles(root);
  const errors = files.flatMap((file) =>
    checkSource({
      file: posixPath(path.relative(root, file)),
      source: readFileSync(file, "utf8"),
      today,
    }),
  );
  return { files, errors };
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const { files, errors } = runCheck();
  if (errors.length > 0) {
    console.error(`Experimental annotation errors (${errors.length}):`);
    for (const error of errors) console.error(`  ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Checked experimental annotations in ${files.length} source files.`,
    );
  }
}
