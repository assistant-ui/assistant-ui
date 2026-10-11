import type { SuiteCandidate, SuiteCase } from "../../types.ts";

export interface SeedFile {
  path: string;
  content: string;
}

export interface EvalCase extends SuiteCase {
  /** Files written into the sandbox before the agent runs. */
  seed: SeedFile[];
  /** The task handed to the agent (mimics a real user/PR request). */
  task: string;
  /** Rubric the judge applies to the post-run files. */
  rubric: string;
  /** Files (relative paths) handed to the judge. */
  inspect: string[];
}

export interface Candidate extends SuiteCandidate {
  /** Guidance appended to the agent's system prompt. Empty = undirected. */
  prompt: string;
}

export interface Verdict {
  pass: boolean;
  reason: string;
}

/** A judged trial: the verdict and the files the judge saw. */
export interface Judged {
  verdict: Verdict;
  artifact: string;
}
