export interface SuiteCase {
  /** Stable id used on the CLI. */
  id: string;
  /** One-line description of the behavior under test. */
  description: string;
}

export interface SuiteCandidate {
  /** Short label for reports and the CANDIDATES filter. */
  label: string;
}

/**
 * A completed trial carries the suite's outcome; an errored one (CLI timeout,
 * non-zero exit) carries only a message. The union keeps `outcome` unreachable
 * on the error branch, so consumers can't read a synthetic value by mistake.
 */
export type TrialResult<TOutcome> =
  | { error?: false; outcome: TOutcome }
  | { error: true; message: string };

export interface VariantResult<TCandidate, TOutcome> {
  candidate: TCandidate;
  trials: TrialResult<TOutcome>[];
}

export interface CaseResult<TCase, TCandidate, TOutcome> {
  case: TCase;
  variants: VariantResult<TCandidate, TOutcome>[];
}

/** How a completed trial shows up in the progress output. */
export interface TrialView {
  /** Printed once per trial. */
  mark: string;
  /** Printed with DUMP, followed by the artifact. */
  verdict: string;
  artifact: string;
}

/**
 * One family of evals. The suite decides what a trial measures and how its
 * results are reported; the runner repeats trials across candidates and keeps
 * a failing call from ending the sweep.
 */
export interface Suite<
  TCase extends SuiteCase,
  TCandidate extends SuiteCandidate,
  TOutcome,
> {
  /** Stable id used on the CLI and as the results directory. */
  id: string;
  cases: TCase[];
  candidates: TCandidate[];
  /** Runs and judges one trial; throws on an infrastructure failure. */
  run(c: TCase, candidate: TCandidate): TOutcome | Promise<TOutcome>;
  view(outcome: TOutcome): TrialView;
  /** Printed after a candidate's trials, such as its pass rate. */
  summarize(trials: TrialResult<TOutcome>[]): string;
  report(results: CaseResult<TCase, TCandidate, TOutcome>[]): string;
}
