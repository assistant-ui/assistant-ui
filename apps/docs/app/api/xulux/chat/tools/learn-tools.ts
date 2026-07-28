import { tool, zodSchema } from "ai";
import { z } from "zod";
import { resolveNextCourseStep } from "@/lib/xulux/learn/next-step-result";
import type {
  LearnContext,
  LearnCourseStepResult,
} from "@/lib/xulux/learn/types";

export function createLearnTools(
  context: LearnContext | null,
  onResult?: (result: LearnCourseStepResult) => void,
) {
  if (!context) return {};

  return {
    getNextCourseStep: tool({
      description:
        "Advance the active Learn course by exactly one canonical step. Call with no arguments only when the learner starts the course or explicitly asks to continue. Never call it for lesson questions.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const result = await resolveNextCourseStep(context);
        onResult?.(result);
        return result;
      },
    }),
  };
}
