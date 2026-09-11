import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { arch, cpus, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
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
  for (const file of raw.files ?? []) {
    for (const group of file.groups ?? []) {
      for (const b of group.benchmarks ?? []) {
        rows.push({
          id: `${group.fullName ?? file.filepath} > ${b.name}`.replace(
            pkgRoot + "/",
            "",
          ),
          name: b.name,
          mean: b.mean,
          hz: b.hz,
          rme: b.rme,
          p99: b.p99,
          samples: b.sampleCount,
        });
      }
    }
  }
  return rows;
};

export const runSuite = (extraEnv = {}) => {
  const tmp = join(perfDir, "raw.json");
  const env = { ...process.env, ...extraEnv };
  if (!("AUI_PERF_REF_ROOT" in extraEnv)) delete env.AUI_PERF_REF_ROOT;
  const res = spawnSync(
    "pnpm",
    ["exec", "vitest", "bench", "--run", "--outputJson", tmp],
    {
      cwd: pkgRoot,
      stdio: ["ignore", "ignore", "inherit"],
      env,
    },
  );
  if (res.status !== 0) process.exit(res.status ?? 1);
  const raw = JSON.parse(readFileSync(tmp, "utf8"));
  rmSync(tmp);
  return flattenBenchmarks(raw);
};
