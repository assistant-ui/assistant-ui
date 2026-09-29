import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { arch, cpus, platform } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const perfDir = join(pkgRoot, ".perf");

export const git = (args, cwd = pkgRoot) => {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
};

export const repoRoot = () => git(["rev-parse", "--show-toplevel"]);

export const envStamp = (root = pkgRoot) => ({
  date: new Date().toISOString(),
  cpu: cpus()[0]?.model ?? "unknown",
  cores: cpus().length,
  arch: arch(),
  platform: platform(),
  node: process.version,
  sha: git(["rev-parse", "--short", "HEAD"], root),
  dirty: git(["status", "--porcelain"], root) !== "",
});

export const flattenBenchmarks = (raw) => {
  const rows = [];
  for (const file of raw.testResults ?? []) {
    for (const result of file.assertionResults ?? []) {
      for (const benchmark of result.benchmarks ?? []) {
        for (const task of benchmark.tasks ?? []) {
          rows.push({
            id: `${relative(pkgRoot, file.name)} > ${benchmark.name}`,
            name: task.name,
            mean: task.latency.mean,
            hz: 1000 / task.latency.mean,
            rme: task.latency.rme,
            p99: task.latency.p99,
            samples: task.latency.samplesCount,
          });
        }
      }
    }
  }
  return rows;
};

// The JSON reporter is the only reporter, so a failing bench's error reaches nothing but the report file.
export const failureLines = (raw) => {
  const lines = [];
  for (const file of raw.testResults ?? []) {
    const name = relative(pkgRoot, file.name);
    if (file.message) lines.push(`${name}: ${file.message}`);
    for (const result of file.assertionResults ?? []) {
      for (const message of result.failureMessages ?? [])
        lines.push(`${name} > ${result.fullName}: ${message}`);
    }
  }
  return lines;
};

// `files` narrows the run to those bench files, as paths relative to this package; none runs every bench.
export const runSuite = (extraEnv = {}, files = []) => {
  const tmp = join(perfDir, "raw.json");
  const env = { ...process.env, ...extraEnv };
  if (!("AUI_PERF_REF_ROOT" in extraEnv)) delete env.AUI_PERF_REF_ROOT;
  rmSync(tmp, { force: true });
  const res = spawnSync(
    "pnpm",
    [
      "exec",
      "vitest",
      "bench",
      "--run",
      "--reporter=json",
      "--outputFile",
      tmp,
      ...files.map((file) => join(pkgRoot, file)),
    ],
    {
      cwd: pkgRoot,
      stdio: ["ignore", "ignore", "inherit"],
      env,
    },
  );
  const raw = existsSync(tmp) ? JSON.parse(readFileSync(tmp, "utf8")) : null;
  rmSync(tmp, { force: true });
  if (res.status !== 0) {
    for (const line of raw ? failureLines(raw) : []) console.error(line);
    process.exit(res.status ?? 1);
  }
  return flattenBenchmarks(raw);
};
