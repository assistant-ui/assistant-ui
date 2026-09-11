import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  attributeRows,
  benchCoverage,
  workspaceGraph,
} from "./attribution.mjs";
import { meanRows, pairNoise, rowVerdict } from "./paired-compare.mjs";
import { changedPackages, ensureRefWorktree } from "./ref-worktree.mjs";
import {
  buildCompareDoc,
  renderCompareMarkdown,
  renderCompareTerminal,
  writeLaneOutputs,
} from "./report.mjs";
import { envStamp, perfDir, pkgRoot, repoRoot, runSuite } from "./suite.mjs";

const mergeBest = (best, rows) => {
  for (const row of rows) {
    const prev = best.get(row.id);
    if (!prev || row.mean < prev.mean) best.set(row.id, row);
  }
};

export const record = (outName, runs) => {
  mkdirSync(perfDir, { recursive: true });
  const best = new Map();
  for (let i = 0; i < runs; i++) {
    console.error(`run ${i + 1}/${runs}...`);
    mergeBest(best, runSuite());
  }
  const doc = {
    env: { ...envStamp(), runs, estimator: "best" },
    benchmarks: [...best.values()],
  };
  const out = join(perfDir, outName ?? `record-${Date.now()}.json`);
  writeFileSync(out, JSON.stringify(doc, null, 2));
  copyFileSync(out, join(perfDir, "latest.json"));
  console.log(
    `\nrecorded ${doc.benchmarks.length} benchmarks (best of ${runs} runs) -> ${out}`,
  );
};

const ENV_KEYS = ["cpu", "cores", "arch", "platform", "node"];

const envWarnings = (a, b) => {
  const warnings = [];
  if (ENV_KEYS.some((key) => a.env[key] !== b.env[key])) {
    const show = (env) => ENV_KEYS.map((key) => env[key]).join("/");
    warnings.push(
      `environments differ (${show(a.env)} vs ${show(b.env)}); deltas are not comparable`,
    );
  }
  if (a.env.estimator !== b.env.estimator) {
    warnings.push(
      `recordings use different estimators (${a.env.estimator} vs ${b.env.estimator}); best-of runs systematically lower than mean-of, so deltas are not comparable`,
    );
  }
  return warnings;
};

const buildRows = (a, b, spreads) => {
  const bById = new Map(b.benchmarks.map((row) => [row.id, row]));
  const aIds = new Set(a.benchmarks.map((row) => row.id));
  const rows = [];
  const warnings = [];
  for (const ba of a.benchmarks) {
    const bb = bById.get(ba.id);
    if (!bb) {
      warnings.push(`unmatched: only in ${a.label}: ${ba.id}`);
      continue;
    }
    const { delta, noise } = rowVerdict(ba, bb, spreads?.get(ba.id));
    rows.push({ id: ba.id, a: ba.mean, b: bb.mean, delta, noise });
  }
  for (const bb of b.benchmarks.filter((row) => !aIds.has(row.id)))
    warnings.push(`unmatched: only in ${b.label}: ${bb.id}`);
  return { rows, warnings };
};

const stamp = (env) => `${env.sha}${env.dirty ? ", dirty" : ""}`;

const side = (label, env) => ({ label, sha: env.sha, dirty: env.dirty });

const emit = (rows, meta, outputs) => {
  const doc = buildCompareDoc(rows, meta);
  renderCompareTerminal(doc);
  writeLaneOutputs(doc, outputs, renderCompareMarkdown);
};

const resolvePerf = (p) => (p.includes("/") ? resolve(p) : join(perfDir, p));

export const compareFiles = (aPath, bPath, outputs) => {
  const a = JSON.parse(readFileSync(resolvePerf(aPath), "utf8"));
  const b = JSON.parse(readFileSync(resolvePerf(bPath), "utf8"));
  a.label = `a (${stamp(a.env)})`;
  b.label = `b (${stamp(b.env)})`;
  const { rows, warnings } = buildRows(a, b);
  emit(
    rows,
    {
      base: side(a.label, a.env),
      head: side(b.label, b.env),
      warnings: [...envWarnings(a, b), ...warnings],
      footer: [
        `a: ${a.env.sha}${a.env.dirty ? " (dirty)" : ""} @ ${a.env.date}`,
        `b: ${b.env.sha}${b.env.dirty ? " (dirty)" : ""} @ ${b.env.date}`,
        "floor = max(2×rme, 3%)",
      ],
    },
    outputs,
  );
};

export const compareRef = (ref, requestedRuns, outputs) => {
  const { wt, sha, marker } = ensureRefWorktree(ref);
  mkdirSync(perfDir, { recursive: true });
  // Drift cancellation needs the C R / R C alternation balanced, which only
  // holds for an even number of interleaved runs.
  const runs = requestedRuns % 2 ? requestedRuns + 1 : requestedRuns;
  if (runs !== requestedRuns) {
    console.error(
      `rounding --runs up to ${runs} to keep the interleaving balanced`,
    );
  }
  const curRuns = [];
  const refRuns = [];
  const sides = [
    ["current", () => curRuns.push(new Map(runSuite().map((r) => [r.id, r])))],
    [
      ref,
      () =>
        refRuns.push(
          new Map(runSuite({ AUI_PERF_REF_ROOT: wt }).map((r) => [r.id, r])),
        ),
    ],
  ];
  // Runner drift saturates rather than staying linear: a boosted cold start
  // settling into a slower steady state is concave, and under a concave curve
  // the endpoint slots the interleaving hands one side sum to less than the
  // middle slots. Burn the transient in a discarded warm-up pair; the
  // balanced interleaving then only has to cancel the near-linear remainder.
  console.error("warm-up pair (discarded)...");
  runSuite();
  runSuite({ AUI_PERF_REF_ROOT: wt });
  for (let i = 0; i < runs; i++) {
    // Alternating the block orientation per pair (C R R C, then R C C R)
    // equalizes the squared slot sums as well, so residual curvature after
    // the warm-up does not accumulate on one side as runs grow.
    const order = (i >> 1) % 2 === i % 2 ? sides : [...sides].reverse();
    for (const [label, run] of order) {
      console.error(`interleaved run ${i + 1}/${runs}: ${label}...`);
      run();
    }
  }
  const refDoc = {
    env: { ...envStamp(wt), runs, estimator: "mean" },
    benchmarks: [...meanRows(refRuns).values()],
  };
  const curDoc = {
    env: { ...envStamp(), runs, estimator: "mean" },
    benchmarks: [...meanRows(curRuns).values()],
  };
  writeFileSync(
    join(perfDir, `ref-${sha}.json`),
    JSON.stringify(refDoc, null, 2),
  );
  writeFileSync(join(perfDir, "latest.json"), JSON.stringify(curDoc, null, 2));

  const root = repoRoot();
  const changed = changedPackages(root, wt);
  const coverage = benchCoverage(join(pkgRoot, "bench"), workspaceGraph(root));
  refDoc.label = ref === sha ? `base (${sha})` : `${ref} (${sha})`;
  curDoc.label = `head (${stamp(curDoc.env)})`;
  const { rows, warnings } = buildRows(
    refDoc,
    curDoc,
    pairNoise(refRuns, curRuns),
  );
  emit(
    attributeRows(rows, coverage, changed),
    {
      base: side(refDoc.label, refDoc.env),
      head: side(curDoc.label, curDoc.env),
      warnings: [...envWarnings(refDoc, curDoc), ...warnings],
      changed,
      runs,
      footer: [
        `base \`${refDoc.env.sha}\``,
        `head \`${stamp(curDoc.env)}\``,
        `${runs} interleaved runs per side after a discarded warm-up pair`,
        "floor = max(2×rme, 3%, 2×SE of the pair deltas)",
      ],
    },
    outputs,
  );
  console.error(
    `ref worktree kept at ${wt}; remove with: git worktree remove "${wt}" && rm "${marker}"`,
  );
};
