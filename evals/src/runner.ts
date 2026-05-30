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
  for (const candidate of candidates) {
    process.stdout.write(`  ${candidate.label.padEnd(14)} `);
    const ts: TrialResult[] = [];
    for (let i = 0; i < trials; i++) {
      let trial: TrialResult;
      try {
        const artifact = runAgent(c, candidate.prompt);
        trial = { verdict: runJudge(c.rubric, artifact), artifact };
      } catch (err) {
        trial = {
          verdict: {
            pass: false,
            reason: `trial error: ${(err as Error).message}`,
          },
          artifact: "",
          error: true,
        };
      }
      ts.push(trial);
      process.stdout.write(trial.error ? "E" : trial.verdict.pass ? "." : "x");
      if (process.env.DUMP) {
        const tag = trial.error
          ? "ERROR"
          : trial.verdict.pass
            ? "PASS"
            : "FAIL";
        process.stdout.write(
          `\n--- ${candidate.label} trial ${i + 1} (${tag}: ${trial.verdict.reason}) ---\n${trial.artifact}\n`,
        );
      }
    }
    const scored = ts.filter((t) => !t.error);
    const passRate = scored.length
      ? scored.filter((t) => t.verdict.pass).length / scored.length
      : 0;
    process.stdout.write(`  ${Math.round(passRate * 100)}%\n`);
    variants.push({ candidate, trials: ts, passRate });
  }
  return { case: c, variants };
}
