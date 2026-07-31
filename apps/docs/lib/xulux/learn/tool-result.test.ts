import { parseLearnCourseStepResult } from "./tool-result";

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
  });
});
