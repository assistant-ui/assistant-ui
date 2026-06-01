export interface SeedFile {
  path: string;
  content: string;
}

export interface EvalCase {
  /** Stable id used on the CLI. */
  id: string;
  /** One-line description of the behavior under test. */
  description: string;
  /** Files written into the sandbox before the agent runs. */
  seed: SeedFile[];
  /** The task handed to the agent (mimics a real user/PR request). */
  task: string;
  /** Rubric the judge applies to the post-run files. */
  rubric: string;
  /** Files (relative paths) handed to the judge. */
  inspect: string[];
}

export interface Candidate {
  /** Short label for reports. "baseline" is the empty, undirected prompt. */
  label: string;
  /** Guidance appended to the agent's system prompt. Empty = undirected. */
  prompt: string;
}

export interface Verdict {
  pass: boolean;
  reason: string;
}

/**
 * A completed trial carries a judged verdict; an errored one (CLI timeout,
 * non-zero exit) carries only a message. The union keeps `verdict` unreachable
 * on the error branch, so consumers can't read a synthetic value by mistake.
 */
export type TrialResult =
  | { error?: false; verdict: Verdict; artifact: string }
  | { error: true; message: string; artifact: "" };

export interface VariantResult {
  candidate: Candidate;
  trials: TrialResult[];
  passRate: number;
}

export interface CaseResult {
  case: EvalCase;
  variants: VariantResult[];
}
