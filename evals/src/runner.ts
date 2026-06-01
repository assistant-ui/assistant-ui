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
 *
 * A trial that throws (CLI timeout, non-zero exit) is recorded as an error and
 * excluded from the pass rate — one flaky call shouldn't abort a long sweep,
 * nor be miscounted as a behavioral failure.
 */
export function runCase(
  c: EvalCase,
  candidates: Candidate[],
  trials: number,
): CaseResult {
  const variants: VariantResult[] = [];
  const labelW = Math.max(14, ...candidates.map((c) => c.label.length));
  for (const candidate of candidates) {
    process.stdout.write(`  ${candidate.label.padEnd(labelW)} `);
    const ts: TrialResult[] = [];
    for (let i = 0; i < trials; i++) {
      let trial: TrialResult;
      try {
        const artifact = runAgent(c, candidate.prompt);
        trial = { verdict: runJudge(c.rubric, artifact), artifact };
      } catch (err) {
        trial = { error: true, message: (err as Error).message, artifact: "" };
      }
      ts.push(trial);
      process.stdout.write(trial.error ? "E" : trial.verdict.pass ? "." : "x");
      if (process.env.DUMP) {
        const detail = trial.error
          ? `ERROR: ${trial.message}`
          : `${trial.verdict.pass ? "PASS" : "FAIL"}: ${trial.verdict.reason}`;
        process.stdout.write(
          `\n--- ${candidate.label} trial ${i + 1} (${detail}) ---\n${trial.artifact}\n`,
        );
      }
    }
    const scored = ts.filter((t) => !t.error);
    const passRate = scored.length
      ? scored.filter((t) => !t.error && t.verdict.pass).length / scored.length
      : 0;
    process.stdout.write(`  ${Math.round(passRate * 100)}%\n`);
    variants.push({ candidate, trials: ts, passRate });
  }
  return { case: c, variants };
}
