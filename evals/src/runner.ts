import type {
  CaseResult,
  Suite,
  SuiteCandidate,
  SuiteCase,
  TrialResult,
  TrialView,
  VariantResult,
} from "./types.ts";

/**
 * Run every candidate against a case `trials` times.
 *
 * A trial that throws (CLI timeout, non-zero exit) is recorded as an error with
 * no outcome, so no suite can score it: one flaky call shouldn't abort a long
 * sweep, nor be miscounted as a behavioral failure.
 */
export async function runCase<
  TCase extends SuiteCase,
  TCandidate extends SuiteCandidate,
  TOutcome,
>(
  suite: Suite<TCase, TCandidate, TOutcome>,
  c: TCase,
  candidates: TCandidate[],
  trials: number,
): Promise<CaseResult<TCase, TCandidate, TOutcome>> {
  const variants: VariantResult<TCandidate, TOutcome>[] = [];
  const labelW = Math.max(14, ...candidates.map((c) => c.label.length));
  for (const candidate of candidates) {
    process.stdout.write(`  ${candidate.label.padEnd(labelW)} `);
    const ts: TrialResult<TOutcome>[] = [];
    for (let i = 0; i < trials; i++) {
      let trial: TrialResult<TOutcome>;
      try {
        trial = { outcome: await suite.run(c, candidate) };
      } catch (err) {
        trial = {
          error: true,
          message: err instanceof Error ? err.message : String(err),
        };
      }
      ts.push(trial);
      const view: TrialView = trial.error
        ? { mark: "E", verdict: `ERROR: ${trial.message}`, artifact: "" }
        : suite.view(trial.outcome);
      process.stdout.write(view.mark);
      if (process.env.DUMP) {
        process.stdout.write(
          `\n--- ${candidate.label} trial ${i + 1} (${view.verdict}) ---\n${view.artifact}\n`,
        );
      }
    }
    process.stdout.write(`  ${suite.summarize(ts)}\n`);
    variants.push({ candidate, trials: ts });
  }
  return { case: c, variants };
}
