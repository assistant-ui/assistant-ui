import { buildGenerativeUiAssistantCourse } from "./courses/build-generative-ui-assistant/course";
import type {
  LearnCourseDefinition,
  LearnStageDefinition,
  LearnStepDefinition,
} from "./types";

export const DEFAULT_LEARN_COURSE_ID = buildGenerativeUiAssistantCourse.id;

const LEARN_COURSES: Record<string, LearnCourseDefinition> = {
  [buildGenerativeUiAssistantCourse.id]: buildGenerativeUiAssistantCourse,
};

export class LearnRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearnRegistryError";
  }
}

export function getLearnCourse(courseId: string): LearnCourseDefinition {
  if (!Object.hasOwn(LEARN_COURSES, courseId)) {
    throw new LearnRegistryError(`Unregistered Learn course: ${courseId}`);
  }
  return LEARN_COURSES[courseId]!;
}

export function getLearnStep(
  courseId: string,
  stepId: string,
): LearnStepDefinition {
  const step = getLearnCourse(courseId).steps.find(({ id }) => id === stepId);
  if (!step) {
    throw new LearnRegistryError(
      `Unregistered Learn step: ${courseId}/${stepId}`,
    );
  }
  return step;
}

export function getLearnStage(
  courseId: string,
  stageId: string,
): LearnStageDefinition {
  const stages = getLearnCourse(courseId).stages;
  if (!Object.hasOwn(stages, stageId)) {
    throw new LearnRegistryError(
      `Unregistered Learn stage: ${courseId}/${stageId}`,
    );
  }
  return stages[stageId]!;
}

export function getLearnStageForStep(
  courseId: string,
  stepId: string,
): LearnStageDefinition {
  return getLearnStage(courseId, getLearnStep(courseId, stepId).stageId);
}

export function listLearnStageIds(courseId: string): string[] {
  return Object.keys(getLearnCourse(courseId).stages);
}

export type LearnNextStep =
  | {
      status: "in_progress";
      step: LearnStepDefinition;
    }
  | {
      status: "completed";
    };

export function getNextStep(
  currentStepId: string | null,
  courseId = DEFAULT_LEARN_COURSE_ID,
): LearnNextStep {
  const course = getLearnCourse(courseId);
  if (currentStepId === null) {
    const firstStep = course.steps[0];
    if (!firstStep) return { status: "completed" };
    return { status: "in_progress", step: firstStep };
  }

  getLearnStep(courseId, currentStepId);
  const currentIndex = course.steps.findIndex(({ id }) => id === currentStepId);
  const nextStep = course.steps[currentIndex + 1];
  if (!nextStep) return { status: "completed" };
  return { status: "in_progress", step: nextStep };
}
