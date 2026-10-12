import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LanguageModel } from "ai";
import type { Suite } from "../../types.ts";
import { generateAnswer } from "./generate.ts";
import { judgeAnswer } from "./judge.ts";
import { createRenderer, type Renderer } from "./render.ts";
import { formatScore, mean, overall, renderReport } from "./report.ts";
import { tasks } from "./tasks.ts";
import type { Candidate, Format, Judged, RenderAnswer, Task } from "./types.ts";

const FORMATS: Format[] = ["text", "present", "spec", "frame"];

const modelName = (model: LanguageModel) =>
  typeof model === "string" ? model : model.modelId;

/**
 * Which answer format do models write best, and what does spec mode's lack of
 * computed values cost? Every model answers every task in every format, the
 * answer renders in a browser, and a separate judge scores its screenshots.
 */
export function createGenerativeUISuite({
  models,
  judge,
  maxRepairRounds = 2,
  render,
  saveTo,
}: {
  models: LanguageModel[];
  judge: LanguageModel;
  maxRepairRounds?: number;
  /** Renders an answer for the judge; defaults to a headless Chrome started on first use. */
  render?: RenderAnswer;
  /** A directory to save each trial's screenshots and verdict in, emptied on the first save. */
  saveTo?: string;
}): Suite<Task, Candidate, Judged> {
  let renderer: Promise<Renderer> | undefined;
  const renderAnswer: RenderAnswer =
    render ??
    (async (format, artifact) => {
      renderer ??= createRenderer();
      return (await renderer).render(format, artifact);
    });

  const saved = new Map<string, number>();
  /** Where a trial's files go, without an extension; the first call empties the directory. */
  const trialPath = (task: Task, candidate: Candidate) => {
    if (!saveTo) return undefined;
    if (saved.size === 0) rmSync(saveTo, { recursive: true, force: true });
    const key = `${task.id}/${candidate.label}`;
    const n = (saved.get(key) ?? 0) + 1;
    saved.set(key, n);
    const dir = join(saveTo, task.id);
    mkdirSync(dir, { recursive: true });
    return join(dir, `${candidate.label.replace(/[^\w.-]+/g, "_")}-${n}`);
  };

  return {
    id: "generative-ui",
    cases: tasks,
    // Model calls dominate a trial, so a case's trials run a dozen at a time.
    concurrency: 12,
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
      const rendered = await renderAnswer(answer.answeredIn, answer.artifact);
      const path = trialPath(task, candidate);
      const screenshots = path
        ? rendered.screenshots.map((png, i) => {
            const file = `${path}.${i + 1}.png`;
            writeFileSync(file, Buffer.from(png, "base64"));
            return file;
          })
        : [];
      const judged: Judged = {
        ...answer,
        runtimeErrors: rendered.runtimeErrors,
        screenshots,
        ...(await judgeAnswer(
          judge,
          task,
          answer.answeredIn,
          answer,
          rendered,
        )),
      };
      if (path)
        writeFileSync(`${path}.json`, `${JSON.stringify(judged, null, 2)}\n`);
      return judged;
    },
    view: (judged) => ({
      mark: judged.errors.length || judged.runtimeErrors.length ? "x" : ".",
      verdict: `${formatScore(overall(judged.scores))}, ${judged.repairRounds} repair round(s), ${judged.errors.length} error(s) left, ${judged.runtimeErrors.length} while rendering: ${judged.reason}`,
      artifact: judged.screenshots.length
        ? `${judged.artifact}\n(screenshots: ${judged.screenshots.join(", ")})`
        : judged.artifact,
    }),
    summarize: (trials) =>
      formatScore(mean(trials, (judged) => overall(judged.scores))),
    report: renderReport,
    async close() {
      await (await renderer?.catch(() => undefined))?.close();
    },
  };
}

const models = (process.env.MODELS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export const generativeUI = createGenerativeUISuite({
  models: models.length
    ? models
    : [
        "anthropic/claude-opus-5.5",
        "openai/gpt-6-astra",
        "google/gemini-3.1-pro-preview",
      ],
  judge: process.env.JUDGE_MODEL || "anthropic/claude-sonnet-5.5",
  saveTo: fileURLToPath(
    new URL("../../../results/generative-ui/trials", import.meta.url),
  ),
});
