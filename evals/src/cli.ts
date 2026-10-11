import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeDashboardArtifact } from "./eval-report-adapter.ts";
import { runCase } from "./runner.ts";
import { suites } from "./suites/index.ts";
import type { CaseResult } from "./types.ts";
import type {
  Candidate,
  EvalCase,
  Judged,
} from "./suites/comment-hygiene/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dashboardPath = join(here, "..", ".evals_output", "live", "latest.json");
rmSync(dashboardPath, { force: true });
const trials = Number(process.env.TRIALS ?? 3);
if (!Number.isInteger(trials) || trials < 1) {
  throw new Error(
    `TRIALS must be a positive integer, got ${process.env.TRIALS}`,
  );
}

// `node src/cli.ts <suite> [caseId]`, optionally with CANDIDATES=baseline,describe-now
const [suiteId, caseFilter] = process.argv.slice(2);
const loadSuite =
  suiteId !== undefined && Object.hasOwn(suites, suiteId)
    ? suites[suiteId]
    : undefined;
if (!loadSuite) {
  throw new Error(
    `Usage: pnpm eval <suite> [case]. Suites: ${Object.keys(suites).join(", ")}`,
  );
}
const suite = await loadSuite();
const candFilter = process.env.CANDIDATES?.split(",").map((s) => s.trim());

const selectedCases = caseFilter
  ? suite.cases.filter((c) => c.id === caseFilter)
  : suite.cases;
if (caseFilter && selectedCases.length === 0) {
  throw new Error(
    `No case "${caseFilter}" in ${suite.id}. Cases: ${suite.cases.map((c) => c.id).join(", ")}`,
  );
}
const candidates = candFilter
  ? suite.candidates.filter((c) => candFilter.includes(c.label))
  : suite.candidates;
const unknownLabel = candFilter?.find(
  (label) => !suite.candidates.some((c) => c.label === label),
);
if (unknownLabel !== undefined) {
  throw new Error(
    `No candidate "${unknownLabel}" in ${suite.id}. Candidates: ${suite.candidates.map((c) => c.label).join(", ")}`,
  );
}

const candidatesForCase = (caseId: string) =>
  candidates.filter(
    (candidate) => !candidate.caseIds || candidate.caseIds.includes(caseId),
  );
const variantCount = selectedCases.reduce(
  (sum, item) => sum + candidatesForCase(item.id).length,
  0,
);

console.log(
  `Running ${selectedCases.length} case(s), ${variantCount} case/candidate variant(s) × ${trials} trial(s)
`,
);

const results = [];
for (const c of selectedCases) {
  console.log(`# ${c.id}: ${c.description}`);
  const caseCandidates = candidatesForCase(c.id);
  if (!caseCandidates.length) {
    throw new Error(`No candidates selected for case ${c.id}.`);
  }
  results.push(await runCase(suite, c, caseCandidates, trials));
  console.log("");
}

const report = suite.report(results);
console.log(report);

const outDir = join(here, "..", "results", suite.id);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "latest.md"), `${report}\n`);
console.log(`\nWrote results/${suite.id}/latest.md`);

if (suite.id === "comment-hygiene") {
  writeDashboardArtifact(
    dashboardPath,
    results as CaseResult<EvalCase, Candidate, Judged>[],
  );
  console.log(
    "Wrote .evals_output/live/latest.json; run pnpm dashboard to generate the HTML report.",
  );
}
