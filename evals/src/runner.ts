import type {
  EvalCase,
  Candidate,
  CaseResult,
  VariantResult,
  TrialResult,
} from "./types.ts";
import { runAgent } from "./agent.ts";
import { runJudge } from "./judge.ts";

/**
 * Run every candidate against a case `trials` times and report the pass rate.
 * The A/B is the whole point: `baseline` (empty guidance) should reproduce the
 * bad behavior; a candidate earns its place only if it lifts the pass rate.
 */
export function runCase(
  c: EvalCase,
  candidates: Candidate[],
  trials: number,
): CaseResult {
  const variants: VariantResult[] = [];
  for (const candidate of candidates) {
    process.stdout.write(`  ${candidate.label.padEnd(14)} `);
    const ts: TrialResult[] = [];
    for (let i = 0; i < trials; i++) {
      const artifact = runAgent(c, candidate.prompt);
      const verdict = runJudge(c.rubric, artifact);
      ts.push({ verdict, artifact });
      process.stdout.write(verdict.pass ? "." : "x");
      if (process.env.DUMP) {
        process.stdout.write(
          `\n--- ${candidate.label} trial ${i + 1} (${verdict.pass ? "PASS" : "FAIL"}: ${verdict.reason}) ---\n${artifact}\n`,
        );
      }
    }
    const passRate = ts.length
      ? ts.filter((t) => t.verdict.pass).length / ts.length
      : 0;
    process.stdout.write(`  ${Math.round(passRate * 100)}%\n`);
    variants.push({ candidate, trials: ts, passRate });
  }
  return { case: c, variants };
}
