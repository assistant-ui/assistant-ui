#!/usr/bin/env node
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./lib/main.mjs";
import { posixPath, readWorkspaceManifestEntries } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceExtension = /\.(?:[cm]?[jt]sx?|vue|svelte)$/;
const extrasUse = /\bcreateRuntimeExtras\b/;

const bans = [
  {
    name: "ThreadRuntimeCore declaration",
    pattern:
      /\b(?:class|const|let|var|function)\s+(?:[A-Za-z_$][\w$]*)?ThreadRuntimeCore\b/g,
  },
  {
    name: "version counter",
    pattern:
      /\bset[A-Z][\w$]*\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*(?::\s*[\w$.]+\s*)?\)?\s*=>\s*\1\s*\+\s*1\b\s*\)/g,
  },
  {
    name: "version counter",
    pattern:
      /\buseReducer\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*(?::\s*[\w$.]+\s*)?\)?\s*=>\s*\1\s*\+\s*1\b/g,
  },
  {
    name: "notifyUpdate",
    pattern: /\bnotifyUpdate\b/g,
  },
  { name: "Symbol brand", pattern: /\bSymbol\s*\.\s*for\s*\([^)]*\)/g },
  {
    name: "Object.create grafting",
    pattern: /\bObject\s*\.\s*create\s*\((?!\s*null\s*[,)])[^)]*\)/g,
  },
];

function sourceFiles(packageDir) {
  return globSync("src/**/*", { cwd: packageDir })
    .map(posixPath)
    .filter((file) => sourceExtension.test(file))
    .filter(
      (file) =>
        !file
          .split("/")
          .some((part) => part === "test" || part === "__tests__"),
    )
    .filter((file) => !/\.(?:test|spec)\./.test(file))
    .sort();
}

export function runCheck(root = repoRoot) {
  const { manifests } = readWorkspaceManifestEntries(root);
  const violations = [];
  const seen = new Set();
  let packageCount = 0;

  for (const { manifest } of manifests) {
    const packageDir = posixPath(path.dirname(manifest));
    if (
      !packageDir.startsWith("packages/") ||
      packageDir === "packages/core" ||
      seen.has(packageDir)
    )
      continue;
    seen.add(packageDir);
    const files = sourceFiles(path.join(root, packageDir));
    const sources = files.map((file) => ({
      file: `${packageDir}/${file}`,
      source: readFileSync(path.join(root, packageDir, file), "utf8"),
    }));
    if (!sources.some(({ source }) => extrasUse.test(source))) continue;
    packageCount++;

    for (const { file, source } of sources) {
      for (const { name, pattern } of bans) {
        for (const match of source.matchAll(pattern)) {
          violations.push({
            file,
            line: source.slice(0, match.index).split("\n").length,
            name,
            text: match[0].replace(/\s+/g, " ").trim(),
          });
        }
      }
    }
  }

  violations.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.name.localeCompare(b.name),
  );
  return { packageCount, violations };
}

function main() {
  const { violations } = runCheck(process.env.ADAPTER_ARCHITECTURE_CHECK_ROOT);
  for (const { file, line, name, text } of violations) {
    console.error(`${file}:${line}: ${name}: ${text}`);
  }
  if (violations.length > 0) process.exitCode = 1;
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) main();
