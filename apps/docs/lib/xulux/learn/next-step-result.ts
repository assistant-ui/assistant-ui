import { loadRepoSourceSnapshot } from "@/lib/repo-source";
import { compareStageFiles } from "./stage-diff";
import { resolveStageFilesFromSnapshot } from "./stage-source";
import { getNextStep } from "./registry";
import { getLearnCourse, getLearnStage } from "./registry";
import type { LearnContext, LearnCourseStepResult } from "./types";

export async function resolveNextCourseStep(
  context: LearnContext,
): Promise<LearnCourseStepResult> {
  const course = getLearnCourse(context.courseId);
  const next = getNextStep(context.currentStepId, context.courseId);

  if (next.status === "completed") {
    const finalStep = course.steps.at(-1);
    if (!finalStep) throw new Error("Learn course has no final stage.");
    const finalStage = getLearnStage(context.courseId, finalStep.stageId);
    return {
      course: { id: course.id, status: "completed" },
      finalStage: {
        id: finalStage.id,
        previewPath: finalStage.previewPath,
        downloadUrl: downloadUrl(course.id, finalStage.id),
      },
    };
  }

  const stepIndex = course.steps.findIndex(({ id }) => id === next.step.id);
  const stage = getLearnStage(context.courseId, next.step.stageId);
  const snapshot = await loadRepoSourceSnapshot();
  const currentFiles = resolveStageFilesFromSnapshot(
    context.courseId,
    stage.id,
    snapshot,
  );
  const previousStep = course.steps[stepIndex - 1];
  const previousFiles = previousStep
    ? resolveStageFilesFromSnapshot(
        context.courseId,
        previousStep.stageId,
        snapshot,
      )
    : currentFiles;
  const content = snapshot[next.step.lessonPath];
  if (typeof content !== "string") {
    throw new Error(`Missing Learn lesson: ${next.step.lessonPath}`);
  }

  return {
    course: { id: course.id, status: "in_progress" },
    step: {
      id: next.step.id,
      title: next.step.title,
      index: stepIndex + 1,
      total: course.steps.length,
      content,
    },
    stage: {
      id: stage.id,
      previewPath: stage.previewPath,
      downloadUrl: downloadUrl(course.id, stage.id),
      focusFiles: next.step.focusFiles,
    },
    changes: compareStageFiles(previousFiles, currentFiles),
  };
}

function downloadUrl(courseId: string, stageId: string) {
  const params = new URLSearchParams({ courseId, stageId });
  return `/api/xulux/learn/download?${params.toString()}`;
}
