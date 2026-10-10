import { isStepCount, streamText, type LanguageModel } from "ai";
import { startFormat } from "./formats.ts";
import type { Answer, Format, Task } from "./types.ts";

/**
 * Ask the model for one answer in `format`. A tool format validates each call
 * in the tool's `execute` and hands the errors back, so the model gets
 * `maxRepairRounds` more calls to fix them before the answer is scored as is.
 */
export async function generateAnswer(
  model: LanguageModel,
  task: Task,
  format: Format,
  maxRepairRounds: number,
): Promise<Answer> {
  const run = await startFormat(format);
  const started = performance.now();
  let firstOutputMs: number | undefined;
  // The runner records a failed call from the stream's error part, so the default console report would only garble the progress line.
  const onError = () => {};
  const result = run.tools
    ? streamText({
        model,
        system: run.system,
        prompt: task.prompt,
        onError,
        tools: run.tools,
        toolChoice: "required",
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
    const answering =
      part.type === "text-delta"
        ? !run.tools
        : part.type === "tool-input-start" &&
          run.answerTools.includes(part.toolName);
    if (firstOutputMs === undefined && answering) {
      firstOutputMs = performance.now() - started;
    }
  }
  const usage = await result.totalUsage;
  const measured = {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    firstOutputMs,
    totalMs: performance.now() - started,
  };

  const last = run.attempts.at(-1);
  if (!run.tools) {
    const text = await result.text;
    const errors = text.trim() ? [] : ["The answer is empty."];
    return { artifact: text, errors, repairRounds: 0, ...measured };
  }
  if (!last) {
    return {
      artifact: await result.text,
      errors: [`The model never called \`${run.answerTools[0]}\`.`],
      repairRounds: 0,
      ...measured,
    };
  }
  return {
    artifact: last.artifact,
    errors: last.errors,
    repairRounds: run.attempts.length - 1,
    ...measured,
  };
}
