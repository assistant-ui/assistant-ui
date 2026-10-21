import type { LanguageModel } from "ai";
import type { SuiteCandidate, SuiteCase } from "../../types.ts";

export type Format = "text" | "present" | "spec" | "frame";

/** The format a candidate asks for; `auto` offers text, spec, and frame and lets the model choose. */
export type CandidateFormat = Format | "auto";

export interface Task extends SuiteCase {
  /** The user's request, sent as the only message. */
  prompt: string;
  /** The answer has to recompute values as the user changes an input. */
  computed: boolean;
}

export interface Candidate extends SuiteCandidate {
  format: CandidateFormat;
  model: LanguageModel;
  /** The model's id, which the report groups candidates by. */
  modelName: string;
}

export interface Answer {
  /** The Markdown, the final tree or spec, or the widget source: what renders. */
  artifact: string;
  /** Markdown the model wrote around a tool answer, in message order; empty strings when the answer is Markdown itself. */
  prose: { before: string; after: string };
  /** The format `artifact` is in: the one asked for or chosen, or `text` when the model answered in prose without calling an answer tool. */
  answeredIn: Format;
  /** The format of the last answer tool call when every one failed before it ran: the answer renders as the `text` the user sees, and `auto`'s choice tally counts this format. */
  attempted?: Format;
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
  presentation: number;
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
  prose: Answer["prose"],
) => Promise<Rendered>;

export interface Judged extends Answer {
  runtimeErrors: string[];
  /** Where the screenshots the judge scored were saved, when the suite saves them. */
  screenshots: string[];
  scores: Scores;
  reason: string;
}
