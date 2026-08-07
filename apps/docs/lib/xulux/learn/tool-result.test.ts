import { parseLearnCourseStepResult } from "./tool-result";
import { parseLearnContext, toLearnContext } from "./context";
import { createInitialLearnProgress } from "./progress";

describe("Learn context", () => {
  it("accepts registered context and rejects invalid values", () => {
    const progress = {
      ...createInitialLearnProgress("build-generative-ui-assistant", 100),
      status: "in_progress" as const,
      currentStepId: "meet-the-project",
      selectedStepId: "meet-the-project",
    };
    expect(parseLearnContext(toLearnContext(progress))).toEqual({
      courseId: "build-generative-ui-assistant",
      status: "in_progress",
      currentStepId: "meet-the-project",
      selectedStepId: "meet-the-project",
    });

    for (const value of [
      undefined,
      {},
      {
        courseId: "missing",
        status: "in_progress",
        currentStepId: null,
        selectedStepId: null,
      },
      {
        courseId: "build-generative-ui-assistant",
        status: "in_progress",
        currentStepId: "missing",
        selectedStepId: null,
      },
      {
        courseId: "build-generative-ui-assistant",
        status: "in_progress",
        currentStepId: "",
        selectedStepId: null,
      },
    ]) {
      expect(parseLearnContext(value)).toBeNull();
    }
  });
});

describe("Learn course tool result", () => {
  it("validates in-progress and completion results", () => {
    expect(
      parseLearnCourseStepResult({
        course: { id: "build-generative-ui-assistant", status: "in_progress" },
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
      }),
    ).not.toBeNull();
    expect(
      parseLearnCourseStepResult({
        course: { id: "build-generative-ui-assistant", status: "completed" },
        finalStage: {
          id: "S7",
          previewPath: "/learn/preview/S7",
          downloadUrl: "/download",
        },
      }),
    ).not.toBeNull();
  });

  it("rejects malformed results", () => {
    expect(
      parseLearnCourseStepResult({ course: { status: "completed" } }),
    ).toBeNull();
    const inProgressWithUndefinedFinalStage = parseLearnCourseStepResult({
      course: { id: "build-generative-ui-assistant", status: "in_progress" },
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
        focusFiles: [],
      },
      changes: { files: [], additions: 0, deletions: 0 },
      finalStage: undefined,
    });
    expect(inProgressWithUndefinedFinalStage).not.toBeNull();
    expect(
      Object.hasOwn(inProgressWithUndefinedFinalStage ?? {}, "finalStage"),
    ).toBe(false);
  });
});
