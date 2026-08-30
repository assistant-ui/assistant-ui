#!/usr/bin/env node
import { spawnSync, execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { cpus, arch, platform, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REF_PACKAGE_DIRS } from "./ref-packages.mjs";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const perfDir = join(pkgRoot, ".perf");

const git = (args, cwd = pkgRoot) => {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
};

const envStamp = (root = pkgRoot) => ({
  date: new Date().toISOString(),
  cpu: cpus()[0]?.model ?? "unknown",
  cores: cpus().length,
  arch: arch(),
  platform: platform(),
  node: process.version,
  sha: git(["rev-parse", "--short", "HEAD"], root),
  dirty: git(["status", "--porcelain"], root) !== "",
});

const flattenBenchmarks = (raw) => {
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

const runSuite = (extraEnv = {}) => {
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

const mergeBest = (best, rows) => {
  for (const row of rows) {
    const prev = best.get(row.id);
    if (!prev || row.mean < prev.mean) best.set(row.id, row);
  }
};

const record = (outName, runs) => {
  mkdirSync(perfDir, { recursive: true });
  const best = new Map();
  for (let i = 0; i < runs; i++) {
    console.log(`run ${i + 1}/${runs}...`);
    mergeBest(best, runSuite());
  }
  const doc = { env: { ...envStamp(), runs }, benchmarks: [...best.values()] };
  const out = join(perfDir, outName ?? `record-${Date.now()}.json`);
  writeFileSync(out, JSON.stringify(doc, null, 2));
  copyFileSync(out, join(perfDir, "latest.json"));
  console.log(
    `\nrecorded ${doc.benchmarks.length} benchmarks (best of ${runs} runs) -> ${out}`,
  );
};

const fmt = (ms) =>
  ms >= 1 ? `${ms.toFixed(3)}ms` : `${(ms * 1000).toFixed(2)}µs`;

const renderCompare = (a, b, aLabel, bLabel) => {
  const envKeys = ["cpu", "cores", "arch", "platform", "node"];
  if (envKeys.some((k) => a.env[k] !== b.env[k])) {
    const show = (e) => envKeys.map((k) => e[k]).join("/");
    console.warn(
      `warning: environments differ (${show(a.env)} vs ${show(b.env)}); deltas are not comparable\n`,
    );
  }
  const bById = new Map(b.benchmarks.map((x) => [x.id, x]));
  const rows = [];
  for (const ba of a.benchmarks) {
    const bb = bById.get(ba.id);
    if (!bb) continue;
    const delta = ((bb.mean - ba.mean) / ba.mean) * 100;
    const noise = Math.max(2 * Math.max(ba.rme ?? 0, bb.rme ?? 0), 3);
    const significant = Math.abs(delta) > noise;
    rows.push({
      benchmark: ba.id,
      [aLabel]: fmt(ba.mean),
      [bLabel]: fmt(bb.mean),
      delta: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
      threshold: `${noise.toFixed(1)}%`,
      verdict: !significant ? "~same" : delta > 0 ? "SLOWER" : "FASTER",
    });
  }
  console.table(rows);
  const aIds = new Set(a.benchmarks.map((x) => x.id));
  const matched = new Set(rows.map((r) => r.benchmark));
  for (const x of a.benchmarks.filter((x) => !matched.has(x.id)))
    console.warn(`unmatched: only in a: ${x.id}`);
  for (const x of b.benchmarks.filter((x) => !aIds.has(x.id)))
    console.warn(`unmatched: only in b: ${x.id}`);
  console.log(
    `a: ${a.env.sha}${a.env.dirty ? " (dirty)" : ""} @ ${a.env.date}\nb: ${b.env.sha}${b.env.dirty ? " (dirty)" : ""} @ ${b.env.date}\nverdict is "~same" unless |delta| > max(2×rme, 3%)`,
  );
};

const resolvePerf = (p) => (p.includes("/") ? resolve(p) : join(perfDir, p));

const compareFiles = (aPath, bPath) => {
  const a = JSON.parse(readFileSync(resolvePerf(aPath), "utf8"));
  const b = JSON.parse(readFileSync(resolvePerf(bPath), "utf8"));
  renderCompare(a, b, `a (${a.env.sha})`, `b (${b.env.sha})`);
};

const ensureRefWorktree = (ref) => {
  const repoRoot = git(["rev-parse", "--show-toplevel"]);
  const sha = git(["rev-parse", "--short", ref], repoRoot);
  if (sha === "unknown") {
    console.error(`cannot resolve ref: ${ref}`);
    process.exit(1);
  }
  const wt = join(tmpdir(), `aui-perf-ref-${sha}`);
  const marker = `${wt}.built`;
  if (!existsSync(wt)) {
    if (existsSync(marker)) rmSync(marker);
    execFileSync("git", ["worktree", "prune", "--expire", "now"], {
      cwd: repoRoot,
    });
    console.log(`creating ref worktree for ${ref} (${sha}) at ${wt}`);
    execFileSync("git", ["worktree", "add", "--detach", wt, sha], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  }
  if (!existsSync(marker)) {
    console.log("installing and building ref packages (one-time per ref)...");
    execFileSync("pnpm", ["install"], {
      cwd: wt,
      stdio: "inherit",
      env: { ...process.env, CI: "true" },
    });
    const filters = Object.keys(REF_PACKAGE_DIRS).map(
      (name) => `--filter=${name}`,
    );
    execFileSync("pnpm", ["turbo", "run", "build", ...filters], {
      cwd: wt,
      stdio: "inherit",
    });
    writeFileSync(marker, sha);
  }
  return { wt, sha, marker };
};

const compareRef = (ref, runs) => {
  const { wt, sha, marker } = ensureRefWorktree(ref);
  mkdirSync(perfDir, { recursive: true });
  const current = new Map();
  const refBest = new Map();
  const sides = [
    ["current", () => mergeBest(current, runSuite())],
    [ref, () => mergeBest(refBest, runSuite({ AUI_PERF_REF_ROOT: wt }))],
  ];
  for (let i = 0; i < runs; i++) {
    const order = i % 2 === 0 ? sides : [...sides].reverse();
    for (const [label, run] of order) {
      console.log(`interleaved run ${i + 1}/${runs}: ${label}...`);
      run();
    }
  }
  const refDoc = {
    env: { ...envStamp(wt), runs },
    benchmarks: [...refBest.values()],
  };
  const curDoc = {
    env: { ...envStamp(), runs },
    benchmarks: [...current.values()],
  };
  writeFileSync(
    join(perfDir, `ref-${sha}.json`),
    JSON.stringify(refDoc, null, 2),
  );
  writeFileSync(join(perfDir, "latest.json"), JSON.stringify(curDoc, null, 2));
  renderCompare(refDoc, curDoc, `${ref} (${refDoc.env.sha})`, "current");
  console.log(
    `ref worktree kept at ${wt}; remove with: git worktree remove "${wt}" && rm "${marker}"`,
  );
};

const trace = async (targets, seconds) => {
  const { captureTrace, analyzeTrace } = await import("./trace.mjs");
  const results = [];
  for (const target of targets) {
    const arg = /^https?:/.test(target) ? target : resolve(target);
    const url = new URL(arg, "file:///");
    const hint = basename(url.pathname) || url.hostname || arg;
    console.log(`tracing ${hint} for ${seconds}s...`);
    const events = await captureTrace(arg, seconds);
    results.push({
      target: hint,
      ...analyzeTrace(events, hint, seconds * 1_000_000),
    });
  }
  console.table(
    results.map((r) => ({
      target: r.target,
      "wall (s)": r.wallSeconds.toFixed(1),
      "renderer main": `${r.mainBusyMs.toFixed(0)}ms (${r.mainBusyPct.toFixed(2)}%)`,
      compositor: `${r.compositorBusyMs.toFixed(0)}ms (${r.compositorBusyPct.toFixed(2)}%)`,
      PaintImage: r.counts.PaintImage ?? 0,
      Commit: r.counts.Commit ?? 0,
      PrePaint: r.counts.PrePaint ?? 0,
      frames: r.counts.PipelineReporter ?? 0,
    })),
  );
};

const usage = `usage:
  aui-perf record [name.json] [--runs N]     run benches N times (default 3), save best-of per benchmark to .perf/
  aui-perf compare <a> <b>                   diff two recordings (names in .perf/ or paths)
  aui-perf compare --ref <git-ref> [--runs N] build <git-ref> in a temp worktree, interleave runs, diff against the current tree
  aui-perf trace <page.html...> [--seconds N] trace each page in headless Chrome (default 5s), report paint and thread cost`;

const [, , cmd, ...rest] = process.argv;
const takeFlag = (name, fallback) => {
  const i = rest.indexOf(name);
  if (i === -1) return fallback;
  const value = Number(rest[i + 1]);
  rest.splice(i, 2);
  return value;
};
const runs = takeFlag("--runs", 3);
const seconds = takeFlag("--seconds", 5);
if (!Number.isInteger(runs) || runs < 1) {
  console.error(`invalid --runs value: ${runs}`);
  process.exit(1);
}
if (!Number.isInteger(seconds) || seconds < 1) {
  console.error(`invalid --seconds value: ${seconds}`);
  process.exit(1);
}

if (cmd === "record") record(rest[0], runs);
else if (cmd === "compare" && rest[0] === "--ref" && rest[1])
  compareRef(rest[1], runs);
else if (cmd === "compare" && rest.length === 2) compareFiles(rest[0], rest[1]);
else if (cmd === "trace" && rest.length > 0) await trace(rest, seconds);
else {
  console.log(usage);
  process.exit(cmd ? 1 : 0);
}
