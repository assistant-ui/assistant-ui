import { z } from "zod";
import { getLearnCourse, getLearnStep, LearnRegistryError } from "./registry";
import type { LearnContext } from "./types";

export const learnContextSchema = z.object({
  courseId: z.string().min(1),
  status: z.enum(["not_started", "in_progress", "completed"]),
  currentStepId: z.string().min(1).nullable(),
  selectedStepId: z.string().min(1).nullable(),
});

export function parseLearnContext(value: unknown): LearnContext | null {
  const parsed = learnContextSchema.safeParse(value);
  if (!parsed.success) return null;

  try {
    getLearnCourse(parsed.data.courseId);
    if (parsed.data.currentStepId) {
      getLearnStep(parsed.data.courseId, parsed.data.currentStepId);
    }
    if (parsed.data.selectedStepId) {
      getLearnStep(parsed.data.courseId, parsed.data.selectedStepId);
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof LearnRegistryError) return null;
    throw error;
  }
}

export function toLearnContext(progress: LearnContext): LearnContext {
  return {
    courseId: progress.courseId,
    status: progress.status,
    currentStepId: progress.currentStepId,
    selectedStepId: progress.selectedStepId,
  };
}
