import type {
  CaseResult,
  Suite,
  SuiteCandidate,
  SuiteCase,
  TrialResult,
  TrialView,
  VariantResult,
} from "./types.ts";

/** Runs tasks with at most `concurrency` of them in flight, starting them in the order they were added. */
const limiter = (concurrency: number) => {
  let active = 0;
  const queue: (() => void)[] = [];
  return <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const start = () => {
        active++;
        task()
          .then(resolve, reject)
          .finally(() => {
            active--;
            queue.shift()?.();
          });
      };
      if (active < concurrency) start();
      else queue.push(start);
    });
};

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
  const concurrency = suite.concurrency ?? 1;
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError(
      `${suite.id}: concurrency must be a positive integer, got ${concurrency}.`,
    );
  }
  const limit = limiter(concurrency);
  const attempt = async (
    candidate: TCandidate,
  ): Promise<TrialResult<TOutcome>> => {
    try {
      return { outcome: await suite.run(c, candidate) };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  };
  const scheduled = candidates.map((candidate) =>
    Array.from({ length: trials }, () => limit(() => attempt(candidate))),
  );

  const variants: VariantResult<TCandidate, TOutcome>[] = [];
  const labelW = Math.max(14, ...candidates.map((c) => c.label.length));
  for (const [index, candidate] of candidates.entries()) {
    process.stdout.write(`  ${candidate.label.padEnd(labelW)} `);
    const ts: TrialResult<TOutcome>[] = [];
    for (const [i, pending] of scheduled[index]!.entries()) {
      const trial = await pending;
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
