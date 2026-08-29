#!/usr/bin/env node
import { spawnSync, execSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { cpus, arch, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const perfDir = join(pkgRoot, ".perf");

const git = (args) => {
  try {
    return execSync(`git ${args}`, { cwd: pkgRoot, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
};

const envStamp = () => ({
  date: new Date().toISOString(),
  cpu: cpus()[0]?.model ?? "unknown",
  cores: cpus().length,
  arch: arch(),
  platform: platform(),
  node: process.version,
  sha: git("rev-parse --short HEAD"),
  dirty: git("status --porcelain") !== "",
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

const runSuite = () => {
  const tmp = join(perfDir, "raw.json");
  const res = spawnSync(
    "pnpm",
    ["exec", "vitest", "bench", "--run", "--outputJson", tmp],
    { cwd: pkgRoot, stdio: ["ignore", "ignore", "inherit"] },
  );
  if (res.status !== 0) process.exit(res.status ?? 1);
  const raw = JSON.parse(readFileSync(tmp, "utf8"));
  rmSync(tmp);
  return flattenBenchmarks(raw);
};

const record = (outName, runs) => {
  mkdirSync(perfDir, { recursive: true });
  const best = new Map();
  for (let i = 0; i < runs; i++) {
    console.log(`run ${i + 1}/${runs}...`);
    for (const row of runSuite()) {
      const prev = best.get(row.id);
      if (!prev || row.mean < prev.mean) best.set(row.id, row);
    }
  }
  const doc = {
    env: { ...envStamp(), runs },
    benchmarks: [...best.values()],
  };
  const out = join(perfDir, outName ?? `record-${Date.now()}.json`);
  writeFileSync(out, JSON.stringify(doc, null, 2));
  copyFileSync(out, join(perfDir, "latest.json"));
  console.log(
    `\nrecorded ${doc.benchmarks.length} benchmarks (best of ${runs} runs) -> ${out}`,
  );
};

const fmt = (ms) =>
  ms >= 1 ? `${ms.toFixed(3)}ms` : `${(ms * 1000).toFixed(2)}µs`;

const compare = (aPath, bPath) => {
  const a = JSON.parse(readFileSync(resolvePerf(aPath), "utf8"));
  const b = JSON.parse(readFileSync(resolvePerf(bPath), "utf8"));
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
      [`a (${a.env.sha})`]: fmt(ba.mean),
      [`b (${b.env.sha})`]: fmt(bb.mean),
      delta: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
      threshold: `${noise.toFixed(1)}%`,
      verdict: !significant ? "~same" : delta > 0 ? "SLOWER" : "FASTER",
    });
  }
  console.table(rows);
  const aIds = new Set(a.benchmarks.map((x) => x.id));
  const matched = new Set(rows.map((r) => r.benchmark));
  const unmatched = [
    ...a.benchmarks
      .filter((x) => !matched.has(x.id))
      .map((x) => `only in a: ${x.id}`),
    ...b.benchmarks
      .filter((x) => !aIds.has(x.id))
      .map((x) => `only in b: ${x.id}`),
  ];
  for (const line of unmatched) console.warn(`unmatched: ${line}`);
  console.log(
    `a: ${a.env.sha}${a.env.dirty ? " (dirty)" : ""} @ ${a.env.date}\nb: ${b.env.sha}${b.env.dirty ? " (dirty)" : ""} @ ${b.env.date}\nverdict is "~same" unless |delta| > max(2×rme, 3%)`,
  );
};

const resolvePerf = (p) => (p.includes("/") ? resolve(p) : join(perfDir, p));

const [, , cmd, ...rest] = process.argv;
const runsFlag = rest.indexOf("--runs");
const runs = runsFlag === -1 ? 3 : Number(rest[runsFlag + 1]);
if (!Number.isInteger(runs) || runs < 1) {
  console.error(`invalid --runs value: ${rest[runsFlag + 1]}`);
  process.exit(1);
}
const args = rest.filter(
  (_, i) => runsFlag === -1 || (i !== runsFlag && i !== runsFlag + 1),
);

if (cmd === "record") record(args[0], runs);
else if (cmd === "compare" && args.length === 2) compare(args[0], args[1]);
else {
  console.log(
    "usage:\n  aui-perf record [name.json] [--runs N]   run benches N times (default 3), save best-of per benchmark to .perf/\n  aui-perf compare <a> <b>                 diff two recordings (names in .perf/ or paths)",
  );
  process.exit(cmd ? 1 : 0);
}
