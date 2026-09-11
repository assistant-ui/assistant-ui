import {
  createInitialLearnProgress,
  applyLearnCourseStepResult,
  deserializeLearnProgress,
  learnProgressStorageKey,
  readLearnProgress,
  serializeLearnProgress,
  writeLearnProgress,
  type LearnProgressStorage,
} from "./progress";
import type { LearnProgress } from "./types";

const COURSE_ID = "build-generative-ui-assistant";
const STEP_IDS = [
  "meet-the-project",
  "connect-first-assistant",
  "guide-first-message",
  "add-weather-tool",
  "render-weather-ui",
  "share-editable-notepad",
  "persist-conversations",
  "revise-and-branch",
];

function createStorage(): LearnProgressStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("Learn progress", () => {
  it("serializes and reloads progress", () => {
    const progress: LearnProgress = {
      ...createInitialLearnProgress(COURSE_ID, 100),
      threadId: "thread_123",
      status: "in_progress",
      currentStepId: "connect-first-assistant",
      selectedStepId: "connect-first-assistant",
      completedStepIds: ["meet-the-project"],
      startedAt: 100,
      updatedAt: 200,
      certificateName: "Ada Lovelace",
      certificateGeneratedAt: 180,
    };

    expect(
      deserializeLearnProgress(serializeLearnProgress(progress), COURSE_ID),
    ).toEqual(progress);
  });

  it("writes and reads from the course-scoped storage key", () => {
    const storage = createStorage();
    const progress = createInitialLearnProgress(COURSE_ID, 100);

    expect(writeLearnProgress(storage, progress)).toBe(true);
    expect(storage.getItem(learnProgressStorageKey(COURSE_ID))).not.toBeNull();
    expect(readLearnProgress(storage, COURSE_ID, 200)).toEqual(progress);
  });

  it.each([
    ["invalid JSON", "{"],
    ["invalid shape", JSON.stringify({ courseId: COURSE_ID })],
    [
      "another course",
      serializeLearnProgress(createInitialLearnProgress("another-course", 1)),
    ],
  ])("recovers from %s", (_, raw) => {
    expect(deserializeLearnProgress(raw, COURSE_ID, 500)).toEqual(
      createInitialLearnProgress(COURSE_ID, 500),
    );
  });

  it("recovers from storage failures", () => {
    const storage: LearnProgressStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };

    expect(readLearnProgress(storage, COURSE_ID, 500)).toEqual(
      createInitialLearnProgress(COURSE_ID, 500),
    );
    expect(
      writeLearnProgress(storage, createInitialLearnProgress(COURSE_ID, 500)),
    ).toBe(false);
  });

  it("advances once and keeps repeated results idempotent", () => {
    const started: LearnProgress = {
      ...createInitialLearnProgress(COURSE_ID, 100),
      threadId: "thread_123",
      status: "in_progress",
      startedAt: 100,
    };
    const result = {
      course: { id: COURSE_ID, status: "in_progress" as const },
      step: {
        id: "meet-the-project",
        title: "Meet the project",
        index: 1,
        total: 8,
        content: "Lesson",
      },
      stage: {
        id: "S0",
        previewPath: "/learn/preview/S0",
        downloadUrl: "/download",
        focusFiles: ["app/page.tsx"],
      },
      changes: { files: [], additions: 0, deletions: 0 },
    };

    const once = applyLearnCourseStepResult(started, result, 200);
    const twice = applyLearnCourseStepResult(once, result, 300);
    expect(once.currentStepId).toBe("meet-the-project");
    expect(twice.completedStepIds).toEqual([]);
  });

  it("marks every step complete on the terminal result", () => {
    const progress: LearnProgress = {
      ...createInitialLearnProgress(COURSE_ID, 100),
      status: "in_progress",
      currentStepId: "revise-and-branch",
      selectedStepId: "revise-and-branch",
      completedStepIds: STEP_IDS.slice(0, -1),
    };
    const completed = applyLearnCourseStepResult(
      progress,
      {
        course: { id: COURSE_ID, status: "completed" },
        finalStage: {
          id: "S7",
          previewPath: "/learn/preview/S7",
          downloadUrl: "/download",
        },
      },
      500,
    );

    expect(completed.status).toBe("completed");
    expect(completed.completedStepIds).toEqual(STEP_IDS);
    expect(completed.completedAt).toBe(500);
  });

  it("completes the course when the final lesson is loaded", () => {
    const progress: LearnProgress = {
      ...createInitialLearnProgress(COURSE_ID, 100),
      status: "in_progress",
      currentStepId: "persist-conversations",
      selectedStepId: "persist-conversations",
      completedStepIds: STEP_IDS.slice(0, -2),
    };
    const completed = applyLearnCourseStepResult(
      progress,
      {
        course: { id: COURSE_ID, status: "in_progress" },
        step: {
          id: "revise-and-branch",
          title: "Revise and branch a conversation",
          index: 8,
          total: 8,
          content: "Lesson",
        },
        stage: {
          id: "S7",
          previewPath: "/learn/preview/S7",
          downloadUrl: "/download",
          focusFiles: ["components/assistant-ui/elements/thread.aui.tsx"],
        },
        changes: { files: [], additions: 0, deletions: 0 },
      },
      500,
    );

    expect(completed.status).toBe("completed");
    expect(completed.currentStepId).toBe("revise-and-branch");
    expect(completed.completedStepIds).toEqual(STEP_IDS);
    expect(completed.completedAt).toBe(500);
  });
});
