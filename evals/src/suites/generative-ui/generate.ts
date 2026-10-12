import { isStepCount, streamText, type LanguageModel } from "ai";
import { startFormat } from "./formats.ts";
import type { Answer, CandidateFormat, Task } from "./types.ts";

const MIXED = "The model answered in more than one format at once.";

/**
 * Ask the model for one answer in `format`. A tool format validates each call
 * in the tool's `execute` and hands the errors back, so the model gets
 * `maxRepairRounds` more calls to fix them before the answer is scored as is.
 */
export async function generateAnswer(
  model: LanguageModel,
  task: Task,
  format: CandidateFormat,
  maxRepairRounds: number,
): Promise<Answer> {
  const run = await startFormat(format);
  const started = performance.now();
  let firstTextMs: number | undefined;
  let firstToolMs: number | undefined;
  // The runner records a failed call from the stream's error part, so the default console report would only garble the progress line.
  const onError = () => {};
  const result = run.tools
    ? streamText({
        model,
        system: run.system,
        prompt: task.prompt,
        onError,
        tools: run.tools,
        // Opus 5.5 rejects a forced tool call, so every model may answer without a tool, which is an error unless the candidate takes prose.
        toolChoice: "auto",
        stopWhen: [
          // Two steps of headroom for calls that are not answers, such as frame mode's `read_me`.
          isStepCount(maxRepairRounds + 3),
          () => {
            const last = run.attempts.at(-1);
            return (
              last !== undefined &&
              (last.errors.length === 0 ||
                run.attempts.length > maxRepairRounds)
            );
          },
        ],
      })
    : streamText({ model, system: run.system, prompt: task.prompt, onError });

  for await (const part of result.fullStream) {
    if (part.type === "error") throw part.error;
    if (part.type === "text-delta") {
      firstTextMs ??= performance.now() - started;
    } else if (
      part.type === "tool-input-start" &&
      run.answerTools.includes(part.toolName)
    ) {
      firstToolMs ??= performance.now() - started;
    }
  }
  const usage = await result.totalUsage;
  const measured = {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalMs: performance.now() - started,
  };

  const steps = await result.steps;
  const final = steps.at(-1);
  const formatsOf = (step: (typeof steps)[number]) =>
    step.toolCalls.flatMap((call) => run.toolFormats[call.toolName] ?? []);
  const mixed = steps.some((step) => new Set(formatsOf(step)).size > 1);
  // When prose is an answer, prose that ends the run answers even after failed tool calls, as when the model gives up on a spec that kept failing validation.
  const proseAnswer =
    run.prose &&
    final !== undefined &&
    final.toolCalls.length === 0 &&
    final.text.trim() !== "";
  const last = run.attempts.at(-1);
  if (!last || proseAnswer) {
    const attempted = proseAnswer ? undefined : steps.flatMap(formatsOf).at(-1);
    const errors = proseAnswer
      ? []
      : attempted !== undefined
        ? [
            "The model's answer tool call failed before it ran.",
            ...(mixed ? [MIXED] : []),
          ]
        : !run.prose
          ? [
              `The model never called ${run.answerTools.map((name) => `\`${name}\``).join(" or ")}.`,
            ]
          : ["The answer is empty."];
    return {
      artifact: final?.text ?? "",
      answeredIn: "text",
      ...(attempted !== undefined ? { attempted } : {}),
      errors,
      repairRounds: run.attempts.length,
      firstOutputMs: attempted !== undefined ? firstToolMs : firstTextMs,
      ...measured,
    };
  }
  return {
    artifact: last.artifact,
    answeredIn: last.format,
    errors: mixed ? [...last.errors, MIXED] : last.errors,
    repairRounds: run.attempts.length - 1,
    firstOutputMs: firstToolMs,
    ...measured,
  };
}
