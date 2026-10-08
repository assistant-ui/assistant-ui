import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cases } from "./cases/index.ts";
import { candidates as allCandidates } from "./candidates.ts";
import { runCase } from "./runner.ts";
import { renderReport } from "./report.ts";
import { writeDashboardArtifact } from "./eval-report-adapter.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dashboardPath = join(here, "..", ".evals_output", "live", "latest.json");
rmSync(dashboardPath, { force: true });
const trials = Number(process.env.TRIALS ?? 3);
if (!Number.isInteger(trials) || trials < 1) {
  throw new Error(
    `TRIALS must be a positive integer, got ${process.env.TRIALS}`,
  );
}

// Optional filters: `node src/cli.ts <caseId>` and CANDIDATES=baseline,describe-now
const caseFilter = process.argv[2];
const candFilter = process.env.CANDIDATES?.split(",").map((s) => s.trim());

const selectedCases = caseFilter
  ? cases.filter((c) => c.id === caseFilter)
  : cases;
const candidates = candFilter
  ? allCandidates.filter((c) => candFilter.includes(c.label))
  : allCandidates;

const candidatesForCase = (caseId: string) =>
  candidates.filter(
    (candidate) => !candidate.caseIds || candidate.caseIds.includes(caseId),
  );
const variantCount = selectedCases.reduce(
  (sum, item) => sum + candidatesForCase(item.id).length,
  0,
);

console.log(
  `Running ${selectedCases.length} case(s), ${variantCount} case/candidate variant(s) × ${trials} trial(s)\n`,
);

const results = selectedCases.map((c) => {
  console.log(`# ${c.id}: ${c.description}`);
  const caseCandidates = candidatesForCase(c.id);
  if (!caseCandidates.length) {
    throw new Error(`No candidates selected for case ${c.id}.`);
  }
  const r = runCase(c, caseCandidates, trials);
  console.log("");
  return r;
});

const report = renderReport(results);
console.log(report);

const outDir = join(here, "..", "results");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "latest.md"), `${report}\n`);
console.log(`\nWrote results/latest.md`);
writeDashboardArtifact(dashboardPath, results);
console.log(
  "Wrote .evals_output/live/latest.json; run npm run dashboard to generate the HTML report.",
);
