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
  /** The Markdown, the final tree or spec, or the widget source: what renders. */
  artifact: string;
  /** The format `artifact` is in: the one asked for, or `text` when the model answered in prose without calling the format's tool. */
  answeredIn: Format;
  /** Validation errors left after the last attempt; empty when the answer passed validation. */
  errors: string[];
  /** Tool calls after the first, each answering the previous call's validation errors. */
  repairRounds: number;
  inputTokens: number;
  outputTokens: number;
  /** Milliseconds until the answer itself began streaming (text, or an answer tool's input), when rendering can start. */
  firstOutputMs: number | undefined;
  totalMs: number;
}

export interface Scores {
  clarity: number;
  usefulness: number;
  completeness: number;
}

/** The answer as a chat app shows it, before any interaction. */
export interface Rendered {
  /** PNGs of the rendered answer from top to bottom, base64-encoded. */
  screenshots: string[];
  /** The answer is taller than the screenshots, which stop partway. */
  cutOff: boolean;
  /** Errors the answer raised while rendering, such as a widget's script error or a blank render. */
  runtimeErrors: string[];
}

export type RenderAnswer = (
  format: Format,
  artifact: string,
) => Promise<Rendered>;

export interface Judged extends Answer {
  runtimeErrors: string[];
  /** Where the screenshots the judge scored were saved, when the suite saves them. */
  screenshots: string[];
  scores: Scores;
  reason: string;
}
