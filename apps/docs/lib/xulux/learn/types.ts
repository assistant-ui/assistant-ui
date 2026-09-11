export type LearnStageDefinition = {
  id: string;
  previewPath: string;
  sourceRoot: string;
  previousStageId?: string;
  sharedFiles?: Record<string, string>;
};

export type LearnCourseStartSource =
  | "chat"
  | "curriculum"
  | "suggestion"
  | "spotlight";

export type LearnAutoStartSource = Extract<
  LearnCourseStartSource,
  "suggestion" | "spotlight"
>;

export const LEARN_SPOTLIGHT_HREF = "/learn?start=1&source=spotlight";
export const LEARN_SUGGESTION_HREF = "/learn?start=1&source=suggestion";

export function parseLearnAutoStartSource(
  value: unknown,
): LearnAutoStartSource {
  return value === "spotlight" ? "spotlight" : "suggestion";
}

export type LearnStepDefinition = {
  id: string;
  title: string;
  lessonPath: string;
  stageId: string;
  focusFiles: string[];
};

export type LearnCourseDefinition = {
  id: string;
  title: string;
  outcome: string;
  sharedFiles?: Record<string, string>;
  steps: LearnStepDefinition[];
  stages: Record<string, LearnStageDefinition>;
};

export type LearnProgressStatus = "not_started" | "in_progress" | "completed";

export type LearnProgress = {
  courseId: string;
  threadId: string;
  status: LearnProgressStatus;
  currentStepId: string | null;
  selectedStepId: string | null;
  completedStepIds: string[];
  startedAt?: number;
  updatedAt: number;
  completedAt?: number;
  completionCelebrated?: boolean;
  certificatePromptDismissed?: boolean;
  certificateName?: string;
  certificateGeneratedAt?: number;
};

export type LearnFileChangeStatus = "added" | "modified" | "deleted";

export type LearnFileChange = {
  path: string;
  status: LearnFileChangeStatus;
  additions: number;
  deletions: number;
};

export type LearnStageChanges = {
  files: LearnFileChange[];
  additions: number;
  deletions: number;
};

export type LearnContext = Pick<
  LearnProgress,
  "courseId" | "status" | "currentStepId" | "selectedStepId"
>;

export type LearnCourseStepResult =
  | {
      course: { id: string; status: "in_progress" };
      step: {
        id: string;
        title: string;
        index: number;
        total: number;
        content: string;
      };
      stage: {
        id: string;
        previewPath: string;
        downloadUrl: string;
        focusFiles: string[];
      };
      changes: LearnStageChanges;
    }
  | {
      course: { id: string; status: "completed" };
      finalStage: {
        id: string;
        previewPath: string;
        downloadUrl: string;
      };
    };
