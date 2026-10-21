#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./lib/main.mjs";
import { hasOption } from "./lib/script-options.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const baselinePath = path.join(repoRoot, "knip-baseline.json");

function issueName(item) {
  if (Array.isArray(item)) return item.map(issueName).join(" | ");
  return item.namespace ? `${item.namespace}.${item.name}` : item.name;
}

export function groupReport(report) {
  const groups = {};
  for (const { file, owners: _owners, ...types } of report.issues) {
    for (const [type, items] of Object.entries(types)) {
      for (const item of items) {
        ((groups[type] ??= {})[file] ??= new Set()).add(issueName(item));
      }
    }
  }
  return Object.fromEntries(
    Object.keys(groups)
      .sort()
      .map((type) => [
        type,
        Object.fromEntries(
          Object.keys(groups[type])
            .sort()
            .map((file) => [file, [...groups[type][file]].sort()]),
        ),
      ]),
  );
}

function flatten(groups) {
  const keys = new Set();
  for (const [type, files] of Object.entries(groups)) {
    for (const [file, names] of Object.entries(files)) {
      for (const name of names) keys.add(`${type}: ${file}: ${name}`);
    }
  }
  return keys;
}

export function compareToBaseline(current, baseline) {
  const currentKeys = flatten(current);
  const baselineKeys = flatten(baseline);
  return {
    added: [...currentKeys].filter((key) => !baselineKeys.has(key)).sort(),
    removed: [...baselineKeys].filter((key) => !currentKeys.has(key)).sort(),
  };
}

function runKnip() {
  const bin = path.join(repoRoot, "node_modules", "knip", "bin", "knip.js");
  const result = spawnSync(
    process.execPath,
    [bin, "--reporter", "json", "--no-exit-code"],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    throw new Error(`knip exited with status ${result.status}`);
  }
  return JSON.parse(result.stdout);
}

function main() {
  const current = groupReport(runKnip());
  if (hasOption(process.argv.slice(2), "--update")) {
    writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`);
    return;
  }
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const { added, removed } = compareToBaseline(current, baseline);
  for (const key of added) console.error(`new: ${key}`);
  for (const key of removed) console.error(`resolved: ${key}`);
  if (added.length > 0 || removed.length > 0) {
    console.error(
      "\nRemove the new unused code or dependencies. Once every remaining entry is intended, run `pnpm knip:update` to rewrite knip-baseline.json.",
    );
    process.exitCode = 1;
  }
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) main();
