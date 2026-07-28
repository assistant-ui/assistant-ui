import { frontendTools, type FrontendTools } from "@assistant-ui/react-ai-sdk";
import { createDocsTools } from "./tools/docs-tools";
import { createLearnSourceMapTools } from "./tools/learn-source-map-tools";
import { createLearnSourceSelection } from "./tools/learn-source-selection";
import { createSourceMapTools } from "./tools/source-map-tools";
import { createTemplateTools } from "./tools/template-tools";
import { createLearnTools as createLearnCourseTools } from "./tools/learn-tools";
import type { LearnContext } from "@/lib/xulux/learn/types";

type CommonToolOptions = {
  clientTools: FrontendTools;
  routeUrl: string;
};

function createCommonTools({ routeUrl }: Pick<CommonToolOptions, "routeUrl">) {
  return {
    ...createDocsTools({ routeUrl }),
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
