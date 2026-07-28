import { getLearnCourse, getLearnStep } from "@/lib/xulux/learn/registry";
import type {
  LearnContext,
  LearnCourseStepResult,
} from "@/lib/xulux/learn/types";

export function resolveLearnSourceStageId(context: LearnContext) {
  if (!context.currentStepId) return null;

  const course = getLearnCourse(context.courseId);
  const currentIndex = course.steps.findIndex(
    ({ id }) => id === context.currentStepId,
  );
  const selectedIndex = context.selectedStepId
    ? course.steps.findIndex(({ id }) => id === context.selectedStepId)
    : -1;
  const stepId =
    context.selectedStepId &&
    selectedIndex >= 0 &&
    selectedIndex <= currentIndex
      ? context.selectedStepId
      : context.currentStepId;

  return getLearnStep(context.courseId, stepId).stageId;
}

export function createLearnSourceSelection(context: LearnContext) {
  let stageId = resolveLearnSourceStageId(context);

  return {
    getStageId: () => stageId,
    acceptCourseResult: (result: LearnCourseStepResult) => {
      stageId = "finalStage" in result ? result.finalStage.id : result.stage.id;
    },
  };
}
