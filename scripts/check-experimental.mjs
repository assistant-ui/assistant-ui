#!/usr/bin/env node

// Validates the `@deprecated Experimental since ...` annotations that mark
// experimental API. The public name list comes from the committed api-surface
// files and the annotations from source, so the check needs no build and runs
// unfiltered on every pull request: an experimental window closes with the
// calendar rather than with a diff, so a filtered run would never see it.

import { readFileSync, readdirSync, statSync } from "node:fs";
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

const SOURCE_FILE = /\.(?:ts|tsx|mts|cts)$/;
const TEST_FILE = /(?:\.test\.|\.bench\.|[\\/]__tests__[\\/])/;
const BLOCK_COMMENT = /\/\*\*([\s\S]*?)\*\//g;
// `$` must stay end-of-input rather than end-of-line: a tag body wraps across
// comment lines and runs until the next block tag.
const DEPRECATED_TAG = /@deprecated\b([\s\S]*?)(?=\n[ \t]*\*?[ \t]*@\w|$)/g;

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

function symbolNameAfter(source, index) {
  const rest = source.slice(index, index + 400);
  const match = rest.match(
    /(?:readonly\s+|abstract\s+|declare\s+|export\s+|const\s+|let\s+|var\s+|function\s+|class\s+|interface\s+|type\s+|get\s+|set\s+|static\s+|async\s+|public\s+|protected\s+|private\s+)*([A-Za-z_$][\w$]*)/,
  );
  return match?.[1];
}

// A `@deprecated` body runs to the next block tag, so continuation lines are
// folded back together before the grammar sees them.
export function extractDeprecatedTags(source) {
  const tags = [];
  for (const comment of source.matchAll(BLOCK_COMMENT)) {
    const body = comment[1] ?? "";
    const commentEnd = (comment.index ?? 0) + comment[0].length;
    for (const tag of body.matchAll(DEPRECATED_TAG)) {
      const text = (tag[1] ?? "")
        .split("\n")
        .map((line) => line.replace(/^\s*\*/, "").trim())
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      tags.push({
        text,
        line: source.slice(0, comment.index ?? 0).split("\n").length,
        symbol: symbolNameAfter(source, commentEnd),
      });
    }
  }
  return tags;
}

// The wordings this grammar replaces. A removal notice on an experimental
// symbol is legitimate; describing the experiment itself in free prose is what
// the grammar exists to stop coming back.
const LEGACY_EXPERIMENTAL_PROSE =
  /\b(?:experimental|unstable|under active development|may change|might change)\b/i;

const SURFACE_NAME = /\b(?:unstable_|Unstable_|experimental_)\w+/g;
const SURFACE_ALIAS = /\b(\w+) as ((?:unstable_|Unstable_|experimental_)\w+)/g;

// api-surface holds exactly what ships, so every experimental identifier in it
// is public whether it is a top-level export or a member of an exported type.
// An aliased export (`convertMessages as unstable_convertMessages`) carries its
// annotation on the local declaration, so both names resolve to one symbol.
export function collectSurfaceNames(sources) {
  const names = new Set();
  const aliasSource = new Map();
  for (const source of sources) {
    for (const [name] of source.matchAll(SURFACE_NAME)) names.add(name);
    for (const [, local, exported] of source.matchAll(SURFACE_ALIAS)) {
      aliasSource.set(exported, local);
    }
  }
  return { names, aliasSource };
}

export function checkSource({ file, source, now, windowDays, staleAfterDays }) {
  const errors = [];
  const warnings = [];
  const annotated = new Set();
  const experimental = new Set();
  for (const tag of extractDeprecatedTags(source)) {
    const record = parseDeprecatedTag(tag.text);
    const where = `${file}:${tag.line}${tag.symbol ? ` (${tag.symbol})` : ""}`;
    if (record.kind === "invalid") {
      errors.push(`${where}: ${record.reason}`);
      continue;
    }
    // An experimental API that is on its way out carries an ordinary
    // deprecation instead: the two are successive states of one lifecycle, not
    // separate axes, so a removal notice replaces the experimental window
    // rather than sitting beside it.
    if (record.kind === "deprecated") {
      if (tag.symbol) annotated.add(tag.symbol);
      if (
        EXPERIMENTAL_PREFIX_PATTERN.test(tag.symbol ?? "") &&
        LEGACY_EXPERIMENTAL_PROSE.test(record.prose)
      ) {
        errors.push(
          `${where}: describes an experimental API in free prose; use "Experimental since <date>. ${EXPERIMENTAL_BOILERPLATE}".`,
        );
      }
      continue;
    }
    if (record.kind !== "experimental") continue;
    if (tag.symbol) {
      annotated.add(tag.symbol);
      experimental.add(tag.symbol);
    }
    const review = reviewDate(record, windowDays);
    if (review < now) {
      errors.push(
        `${where}: experimental window closed ${review}. Graduate it, remove it, or append ", extended <date>" to the tag.`,
      );
      continue;
    }
    if (record.extended.length >= 2) {
      warnings.push({
        symbol: tag.symbol ?? where,
        detail: `extended ${record.extended.length} times, shipped ${record.since}`,
        where,
      });
    } else if (addDays(record.since, staleAfterDays) < now) {
      warnings.push({
        symbol: tag.symbol ?? where,
        detail: `experimental since ${record.since}, review ${review}`,
        where,
      });
    }
  }
  return { errors, warnings, annotated, experimental };
}

function main() {
  const args = process.argv.slice(2);
  const now = optionValues(args, "--today")[0] ?? today();
  const repoRoot = process.cwd();
  const files = collectSourceFiles(path.join(repoRoot, "packages"));

  const errors = [];
  const warnings = [];
  const annotated = new Set();
  const experimental = new Set();
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
    for (const name of result.annotated) annotated.add(name);
    for (const name of result.experimental) experimental.add(name);
  }

  const surfaceRoot = path.join(repoRoot, "api-surface");
  const { names, aliasSource } = collectSurfaceNames(
    readdirSync(surfaceRoot)
      .filter((entry) => entry.endsWith(".ts"))
      .map((entry) => readFileSync(path.join(surfaceRoot, entry), "utf8")),
  );

  const unannotated = [...names]
    .filter(
      (name) => !annotated.has(name) && !annotated.has(aliasSource.get(name)),
    )
    .sort();
  const aliasLocals = new Set(aliasSource.values());
  const misnamed = [...experimental]
    .filter(
      (name) =>
        !EXPERIMENTAL_PREFIX_PATTERN.test(name) && !aliasLocals.has(name),
    )
    .sort();

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
  if (unannotated.length > 0) {
    console.error(
      `Public experimental API with no annotation (${unannotated.length}):`,
    );
    for (const name of unannotated) console.error(`  ${name}`);
    console.error("");
  }
  if (misnamed.length > 0) {
    console.warn(`Experimental but not named unstable_ (${misnamed.length}):`);
    for (const name of misnamed) console.warn(`  ${name}`);
    console.warn("");
  }
  if (errors.length > 0) {
    console.error(`Experimental annotation errors (${errors.length}):`);
    for (const error of errors) console.error(`  ${error}`);
    console.error("");
  }

  const failures = errors.length + unannotated.length;
  if (failures > 0) {
    console.error(
      `${failures} problem(s). Annotate experimental API as "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release."`,
    );
    process.exit(1);
  }
  console.log(
    `Checked ${names.size} public experimental symbol(s) across ${files.length} source file(s).`,
  );
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main();
}
