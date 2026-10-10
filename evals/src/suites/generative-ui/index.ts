import type { LanguageModel } from "ai";
import type { Suite } from "../../types.ts";
import { generateAnswer } from "./generate.ts";
import { judgeAnswer } from "./judge.ts";
import { formatScore, mean, overall, renderReport } from "./report.ts";
import { tasks } from "./tasks.ts";
import type { Candidate, Format, Judged, Task } from "./types.ts";

const FORMATS: Format[] = ["text", "present", "spec", "frame"];

const modelName = (model: LanguageModel) =>
  typeof model === "string" ? model : model.modelId;

/**
 * Which answer format do models write best, and what does spec mode's lack of
 * computed values cost? Every model answers every task in every format; a
 * separate judge scores what the user would see.
 */
export function createGenerativeUISuite({
  models,
  judge,
  maxRepairRounds = 2,
}: {
  models: LanguageModel[];
  judge: LanguageModel;
  maxRepairRounds?: number;
}): Suite<Task, Candidate, Judged> {
  return {
    id: "generative-ui",
    cases: tasks,
    candidates: models.flatMap((model) =>
      FORMATS.map((format) => ({
        label: `${format}:${modelName(model)}`,
        format,
        model,
        modelName: modelName(model),
      })),
    ),
    async run(task, candidate) {
      const answer = await generateAnswer(
        candidate.model,
        task,
        candidate.format,
        maxRepairRounds,
      );
      return {
        ...answer,
        ...(await judgeAnswer(judge, task, candidate.format, answer)),
      };
    },
    view: (judged) => ({
      mark: judged.errors.length ? "x" : ".",
      verdict: `${formatScore(overall(judged.scores))}, ${judged.repairRounds} repair round(s), ${judged.errors.length} error(s) left: ${judged.reason}`,
      artifact: judged.artifact,
    }),
    summarize: (trials) =>
      formatScore(mean(trials, (judged) => overall(judged.scores))),
    report: renderReport,
  };
}

export const generativeUI = createGenerativeUISuite({
  models: process.env.MODELS?.split(",").map((id) => id.trim()) ?? [
    "anthropic/claude-opus-5.5",
    "openai/gpt-6-astra",
    "google/gemini-3.1-pro-preview",
  ],
  judge: process.env.JUDGE_MODEL ?? "anthropic/claude-sonnet-5.5",
});
