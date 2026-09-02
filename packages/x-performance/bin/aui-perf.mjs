#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareFiles, compareRef, record } from "../lib/compare.mjs";
import { pkgRoot, repoRoot } from "../lib/suite.mjs";
import { trace, traceRef } from "../lib/trace-lane.mjs";

const usage = `usage:
  aui-perf record [name.json] [--runs N]        run benches N times (default 3), save best-of per benchmark to .perf/
  aui-perf compare <a> <b>                      diff two recordings (names in .perf/ or paths)
  aui-perf compare --ref <git-ref> [--runs N]   build <git-ref> in a temp worktree, interleave runs, diff against the current tree
  aui-perf trace <fixture.html...> [--seconds N] trace each page in headless Chrome (default 5s), report paint and thread cost
  aui-perf trace --ref <git-ref> <fixture.html...>
                                                trace each fixture against <git-ref>'s package sources, both sides plus screenshots
  aui-perf report --out <file.md> [--bench <json>] [--trace <json>]
                                                assemble the PR comment from lane outputs
  aui-perf size [--update] [--json <file>]      bundle every published entry with rolldown and check it against size-budgets.json
  aui-perf history append --dir <dir> [--from <recording.json>]
  aui-perf history render --dir <dir> [--out <file.md>]
                                                keep and render the nightly wall-time record

  compare and trace accept --json <file> for the machine-readable lane output and --report <file.md> for a standalone markdown report`;

const [, , cmd, ...rest] = process.argv;
const takeValue = (name) => {
  const i = rest.indexOf(name);
  if (i === -1) return undefined;
  const value = rest[i + 1];
  if (value === undefined) {
    console.error(`missing value for ${name}`);
    process.exit(1);
  }
  rest.splice(i, 2);
  return value;
};
const takeNumber = (name, fallback) => {
  const raw = takeValue(name);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    console.error(`invalid ${name} value: ${raw}`);
    process.exit(1);
  }
  return value;
};
const takeFlag = (name) => {
  const i = rest.indexOf(name);
  if (i === -1) return false;
  rest.splice(i, 1);
  return true;
};
const runs = takeNumber("--runs", 3);
const seconds = takeNumber("--seconds", 5);
const resolved = (value) => (value === undefined ? undefined : resolve(value));
const outputs = {
  report: resolved(takeValue("--report")),
  json: resolved(takeValue("--json")),
};
const out = resolved(takeValue("--out"));
const lanes = {
  bench: resolved(takeValue("--bench")),
  trace: resolved(takeValue("--trace")),
};
const dir = resolved(takeValue("--dir"));
const from = resolved(takeValue("--from"));
const update = takeFlag("--update");

if (cmd === "record") record(rest[0], runs);
else if (cmd === "compare" && rest[0] === "--ref" && rest[1])
  compareRef(rest[1], runs, outputs);
else if (cmd === "compare" && rest.length === 2)
  compareFiles(rest[0], rest[1], outputs);
else if (cmd === "trace" && rest[0] === "--ref" && rest.length > 2)
  await traceRef(rest[1], rest.slice(2), seconds, outputs);
else if (cmd === "trace" && rest.length > 0 && rest[0] !== "--ref")
  await trace(rest, seconds, outputs);
else if (cmd === "report" && out) {
  const { assembleReport } = await import("../lib/report.mjs");
  assembleReport({ out, ...lanes });
  console.error(`comment -> ${out}`);
} else if (cmd === "size") {
  const { checkSizes } = await import("../lib/size.mjs");
  const ok = await checkSizes({
    repoRoot: repoRoot(),
    budgetsPath: resolve(repoRoot(), "size-budgets.json"),
    update,
    json: outputs.json,
  });
  process.exit(ok ? 0 : 1);
} else if (cmd === "history" && rest[0] === "append" && dir) {
  const { appendHistory } = await import("../lib/history.mjs");
  const recording = JSON.parse(
    readFileSync(from ?? resolve(pkgRoot, ".perf", "latest.json"), "utf8"),
  );
  console.log(appendHistory({ dir, recording }));
} else if (cmd === "history" && rest[0] === "render" && dir) {
  const { renderHistory } = await import("../lib/history.mjs");
  const markdown = renderHistory({ dir });
  if (out) writeFileSync(out, markdown);
  else process.stdout.write(markdown);
} else {
  console.log(usage);
  process.exit(cmd ? 1 : 0);
}
