import { frontendTools, type FrontendTools } from "@assistant-ui/ai-sdk";
import { tool, zodSchema } from "ai";
import { z } from "zod";
import { resolveNextCourseStep } from "@/lib/xulux/learn/next-step-result";
import { createDocsTools } from "./tools/docs-tools";
import {
  createLearnSourceMapTools,
  createLearnSourceSelection,
} from "./tools/learn-source-map-tools";
import { createSourceMapTools } from "./tools/source-map-tools";
import { createTemplateTools } from "./tools/template-tools";
import type {
  LearnContext,
  LearnCourseStepResult,
} from "@/lib/xulux/learn/types";

type CommonToolOptions = {
  clientTools: FrontendTools;
  routeUrl: string;
};

function createCommonTools({ routeUrl }: Pick<CommonToolOptions, "routeUrl">) {
  return {
    ...createDocsTools({ routeUrl }),
  };
}

function createLearnCourseTools(
  context: LearnContext,
  onResult: (result: LearnCourseStepResult) => void,
) {
  return {
    getNextCourseStep: tool({
      description:
        "Advance the active Learn course by exactly one canonical step. Call with no arguments only when the learner starts the course or explicitly asks to continue. Never call it for lesson questions.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const result = await resolveNextCourseStep(context);
        onResult(result);
        return result;
      },
    }),
  };
}

export function createAppBuilderTools({
  clientTools,
  routeUrl,
}: CommonToolOptions) {
  return {
    ...frontendTools(clientTools),
    ...createSourceMapTools(),
    ...createCommonTools({ routeUrl }),
    ...createTemplateTools(),
  };
}

export function createLearnAgentTools({
  routeUrl,
  learnContext,
}: Pick<CommonToolOptions, "routeUrl"> & { learnContext: LearnContext }) {
  const sourceSelection = createLearnSourceSelection(learnContext);
  return {
    ...createLearnSourceMapTools({
      courseId: learnContext.courseId,
      getStageId: sourceSelection.getStageId,
    }),
    ...createCommonTools({ routeUrl }),
    ...createLearnCourseTools(learnContext, sourceSelection.acceptCourseResult),
  };
}
