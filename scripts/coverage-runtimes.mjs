import { readFileSync } from "node:fs";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import { isExecutedAsMain } from "./lib/main.mjs";
import {
  posixPath,
  readJson,
  readWorkspaceManifestEntries,
} from "./lib/workspace.mjs";

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function coverageWorkspaceDirectories(root) {
  return new Map(
    readWorkspaceManifestEntries(root)
      .manifests.filter(({ pkg }) => pkg.scripts?.["test:coverage"])
      .map(({ manifest, pkg }) => [
        pkg.name,
        posixPath(path.dirname(manifest)),
      ]),
  );
}

function resolveWorkspace(label, runnerRoots, workspaces) {
  if (workspaces.has(label)) return label;

  const pattern = new RegExp(
    `^${label.split("***").map(RegExp.escape).join(".+")}$`,
  );
  let candidates = [...workspaces.keys()].filter((name) => pattern.test(name));
  for (const root of runnerRoots) {
    const directories = [...workspaces.values()].filter((dir) =>
      root.endsWith(`/${dir}`),
    );
    if (directories.length) {
      candidates = candidates.filter((name) =>
        directories.includes(workspaces.get(name)),
      );
    }
  }
  if (candidates.length !== 1) {
    throw new Error(
      `Cannot resolve coverage task "${label}" to one workspace (${candidates.length} matches). Use logs from the matching revision with an identifiable package name or Vitest root.`,
    );
  }
  return candidates[0];
}

export function coverageRuntimes(logs, workspaces, previous = {}) {
  const samples = new Map();
  for (const log of logs) {
    const runnerRoots = new Set();
    let task;
    let fresh = false;
    let durationMs;
    const finish = () => {
      if (!task || !fresh) return;
      if (!Number.isFinite(durationMs) || durationMs <= 0) {
        throw new Error(
          `Coverage task "${task}" has no positive runtime summary. Use logs from a completed successful run.`,
        );
      }
      const name = resolveWorkspace(task, runnerRoots, workspaces);
      const values = samples.get(name) ?? [];
      values.push(durationMs);
      samples.set(name, values);
    };
    for (const raw of log.split("\n")) {
      const line = stripVTControlCharacters(raw)
        .replace(/^\S+Z /, "")
        .trim();
      if (line.startsWith("##[group]")) {
        finish();
        task = line.match(/^##\[group\](.+):test:coverage$/)?.[1];
        runnerRoots.clear();
        fresh = false;
        durationMs = undefined;
      } else if (line === "##[endgroup]") {
        finish();
        task = undefined;
      } else if (task) {
        if (line.startsWith("cache miss, executing")) fresh = true;
        const root = line.match(/^RUN\s+v\S+\s+(.+)$/);
        if (root) runnerRoots.add(posixPath(root[1]));
        const vitest = line.match(/^Duration\s+(\d+(?:\.\d+)?)(ms|s)\s*\(/);
        const node = line.match(/^(?:ℹ|#) duration_ms (\d+(?:\.\d+)?)/);
        if (vitest || node) {
          durationMs =
            (durationMs ?? 0) +
            (vitest
              ? Number(vitest[1]) * (vitest[2] === "s" ? 1000 : 1)
              : Number(node[1]));
        }
      }
    }
    finish();
  }
  if (samples.size === 0) {
    throw new Error(
      "No uncached coverage runtimes found. Supply both shard job logs from successful pull request runs.",
    );
  }
  const runtimes = new Map(
    Object.entries(previous).filter(([name]) => workspaces.has(name)),
  );
  for (const [name, values] of samples) {
    runtimes.set(name, Math.max(1, Math.round(median(values))));
  }
  return Object.fromEntries(
    [...runtimes].sort(([a], [b]) => a.localeCompare(b)),
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    throw new Error(
      "Supply coverage job log paths: node scripts/coverage-runtimes.mjs <job.log> [...].",
    );
  }
  const runtimes = coverageRuntimes(
    files.map((file) => readFileSync(file, "utf8")),
    coverageWorkspaceDirectories(path.resolve(import.meta.dirname, "..")),
    readJson(new URL("./coverage-runtimes.json", import.meta.url)),
  );
  process.stdout.write(`${JSON.stringify(runtimes, null, 2)}\n`);
}
