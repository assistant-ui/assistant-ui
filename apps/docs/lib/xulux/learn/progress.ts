import { z } from "zod";
import type { LearnCourseStepResult, LearnProgress } from "./types";
import { getLearnCourse } from "./registry";

const learnProgressSchema = z.object({
  courseId: z.string(),
  threadId: z.string(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  currentStepId: z.string().nullable(),
  selectedStepId: z.string().nullable(),
  completedStepIds: z.array(z.string()),
  startedAt: z.number().optional(),
  updatedAt: z.number(),
  completedAt: z.number().optional(),
  completionCelebrated: z.boolean().optional(),
  certificatePromptDismissed: z.boolean().optional(),
  certificateName: z.string().optional(),
  certificateGeneratedAt: z.number().optional(),
});

export type LearnProgressStorage = Pick<Storage, "getItem" | "setItem">;

export function learnProgressStorageKey(courseId: string) {
  return `xulux:learn:${courseId}`;
}

export function createInitialLearnProgress(
  courseId: string,
  now = Date.now(),
): LearnProgress {
  return {
    courseId,
    threadId: "",
    status: "not_started",
    currentStepId: null,
    selectedStepId: null,
    completedStepIds: [],
    updatedAt: now,
  };
}

export function serializeLearnProgress(progress: LearnProgress) {
  return JSON.stringify(progress);
}

export function deserializeLearnProgress(
  raw: string | null,
  courseId: string,
  now = Date.now(),
): LearnProgress {
  if (!raw) return createInitialLearnProgress(courseId, now);

  try {
    const result = learnProgressSchema.safeParse(JSON.parse(raw));
    if (!result.success || result.data.courseId !== courseId) {
      return createInitialLearnProgress(courseId, now);
    }
    return result.data as LearnProgress;
  } catch {
    return createInitialLearnProgress(courseId, now);
  }
}

export function readLearnProgress(
  storage: LearnProgressStorage,
  courseId: string,
  now = Date.now(),
) {
  try {
    return deserializeLearnProgress(
      storage.getItem(learnProgressStorageKey(courseId)),
      courseId,
      now,
    );
  } catch {
    return createInitialLearnProgress(courseId, now);
  }
}

export function writeLearnProgress(
  storage: LearnProgressStorage,
  progress: LearnProgress,
) {
  try {
    storage.setItem(
      learnProgressStorageKey(progress.courseId),
      serializeLearnProgress(progress),
    );
    return true;
  } catch {
    return false;
  }
}

export function applyLearnCourseStepResult(
  progress: LearnProgress,
  result: LearnCourseStepResult,
  now = Date.now(),
): LearnProgress {
  if (progress.courseId !== result.course.id) return progress;
  const course = getLearnCourse(progress.courseId);

  if ("finalStage" in result) {
    return {
      ...progress,
      status: "completed",
      completedStepIds: course.steps.map(({ id }) => id),
      completedAt: progress.completedAt ?? now,
      updatedAt: now,
    };
  }

  const isFinalStep = course.steps.at(-1)?.id === result.step.id;
  if (isFinalStep) {
    return {
      ...progress,
      status: "completed",
      currentStepId: result.step.id,
      selectedStepId: result.step.id,
      completedStepIds: course.steps.map(({ id }) => id),
      completedAt: progress.completedAt ?? now,
      updatedAt: now,
    };
  }

  const previousCompleted =
    progress.currentStepId &&
    progress.currentStepId !== result.step.id &&
    !progress.completedStepIds.includes(progress.currentStepId)
      ? [...progress.completedStepIds, progress.currentStepId]
      : progress.completedStepIds;

  return {
    ...progress,
    status: "in_progress",
    currentStepId: result.step.id,
    selectedStepId: result.step.id,
    completedStepIds: previousCompleted,
    updatedAt: now,
  };
}
