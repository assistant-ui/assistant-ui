import type { LanguageModel } from "ai";
import type { SuiteCandidate, SuiteCase } from "../../types.ts";

export type Format = "text" | "present" | "spec" | "frame";

export interface Task extends SuiteCase {
  /** The user's request, sent as the only message. */
  prompt: string;
  /** The answer has to recompute values as the user changes an input. */
  computed: boolean;
}

export interface Candidate extends SuiteCandidate {
  format: Format;
  model: LanguageModel;
  /** The model's id, which the report groups candidates by. */
  modelName: string;
}

export interface Answer {
  /** What the judge reads: the Markdown, the final tree or spec, or the widget source. */
  artifact: string;
  /** Validation errors left after the last attempt; empty when the answer renders. */
  errors: string[];
  /** Tool calls after the first, each answering the previous call's validation errors. */
  repairRounds: number;
  inputTokens: number;
  outputTokens: number;
  /** Milliseconds until the first text or tool input arrived, when rendering can start. */
  firstOutputMs: number | undefined;
  totalMs: number;
}

export interface Scores {
  clarity: number;
  usefulness: number;
  completeness: number;
}

export interface Judged extends Answer {
  scores: Scores;
  reason: string;
}
