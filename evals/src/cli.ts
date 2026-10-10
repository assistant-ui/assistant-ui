import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runCase } from "./runner.ts";
import { suites } from "./suites/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const trials = Number(process.env.TRIALS ?? 3);
if (!Number.isInteger(trials) || trials < 1) {
  throw new Error(
    `TRIALS must be a positive integer, got ${process.env.TRIALS}`,
  );
}

// `node src/cli.ts <suite> [caseId]`, optionally with CANDIDATES=baseline,describe-now
const [suiteId, caseFilter] = process.argv.slice(2);
const suite = suites.find((s) => s.id === suiteId);
if (!suite) {
  throw new Error(
    `Usage: pnpm eval <suite> [case]. Suites: ${suites.map((s) => s.id).join(", ")}`,
  );
}
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

console.log(
  `Running ${selectedCases.length} case(s) × ${candidates.length} candidate(s) × ${trials} trial(s)\n`,
);

const results = [];
for (const c of selectedCases) {
  console.log(`# ${c.id}: ${c.description}`);
  results.push(await runCase(suite, c, candidates, trials));
  console.log("");
}

const report = suite.report(results);
console.log(report);

const outDir = join(here, "..", "results", suite.id);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "latest.md"), `${report}\n`);
console.log(`\nWrote results/${suite.id}/latest.md`);
