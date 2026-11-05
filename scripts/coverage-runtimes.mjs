import { readFileSync } from "node:fs";
import { stripVTControlCharacters } from "node:util";
import { isExecutedAsMain } from "./lib/main.mjs";

export function coverageRuntimes(logs) {
  const samples = new Map();
  for (const log of logs) {
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
      const values = samples.get(task) ?? [];
      values.push(durationMs);
      samples.set(task, values);
    };
    for (const raw of log.split("\n")) {
      const line = stripVTControlCharacters(raw)
        .replace(/^\S+Z /, "")
        .trim();
      if (line.startsWith("##[group]")) {
        finish();
        task = line.match(/^##\[group\](.+):test:coverage$/)?.[1];
        fresh = false;
        durationMs = undefined;
      } else if (line === "##[endgroup]") {
        finish();
        task = undefined;
      } else if (task) {
        if (line.startsWith("cache miss, executing")) fresh = true;
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
  return Object.fromEntries(
    [...samples]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, values]) => {
        values.sort((a, b) => a - b);
        const middle = Math.floor(values.length / 2);
        const median =
          values.length % 2
            ? values[middle]
            : (values[middle - 1] + values[middle]) / 2;
        return [name, Math.max(1, Math.round(median))];
      }),
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
  );
  process.stdout.write(`${JSON.stringify(runtimes, null, 2)}\n`);
}
