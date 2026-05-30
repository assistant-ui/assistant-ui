import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cases } from "./cases/index.ts";
import { candidates as allCandidates } from "./candidates.ts";
import { runCase } from "./runner.ts";
import { renderReport } from "./report.ts";

const here = dirname(fileURLToPath(import.meta.url));
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

console.log(
  `Running ${selectedCases.length} case(s) × ${candidates.length} candidate(s) × ${trials} trial(s)\n`,
);

const results = selectedCases.map((c) => {
  console.log(`# ${c.id}: ${c.description}`);
  const r = runCase(c, candidates, trials);
  console.log("");
  return r;
});

const report = renderReport(results);
console.log(report);

const outDir = join(here, "..", "results");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "latest.md"), `${report}\n`);
console.log(`\nWrote results/latest.md`);
