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

export interface TrialResult {
  verdict: Verdict;
  artifact: string;
}

export interface VariantResult {
  candidate: Candidate;
  trials: TrialResult[];
  passRate: number;
}

export interface CaseResult {
  case: EvalCase;
  variants: VariantResult[];
}
