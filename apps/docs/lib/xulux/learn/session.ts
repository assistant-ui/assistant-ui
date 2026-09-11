import type { LearnProgress } from "./types";

export const LEARN_START_MESSAGE = "Start the course.";

export type LearnStartTransition = {
  progress: LearnProgress;
  shouldSubmitStartMessage: boolean;
};

export function startLearnCourse(
  progress: LearnProgress,
  threadId: string,
  now = Date.now(),
): LearnStartTransition {
  if (progress.status !== "not_started") {
    return { progress, shouldSubmitStartMessage: false };
  }

  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) {
    throw new Error("A Learn thread ID is required to start the course.");
  }

  return {
    progress: {
      ...progress,
      threadId: normalizedThreadId,
      status: "in_progress",
      startedAt: now,
      updatedAt: now,
    },
    shouldSubmitStartMessage: true,
  };
}

export function shouldAutoStartLearnCourse(
  progress: LearnProgress,
  autoStartRequested: boolean,
) {
  return autoStartRequested && progress.status === "not_started";
}
