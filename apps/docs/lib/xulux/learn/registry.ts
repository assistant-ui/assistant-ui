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
  const course = LEARN_COURSES[courseId];
  if (!course) {
    throw new LearnRegistryError(`Unregistered Learn course: ${courseId}`);
  }
  return course;
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
  const stage = getLearnCourse(courseId).stages[stageId];
  if (!stage) {
    throw new LearnRegistryError(
      `Unregistered Learn stage: ${courseId}/${stageId}`,
    );
  }
  return stage;
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
