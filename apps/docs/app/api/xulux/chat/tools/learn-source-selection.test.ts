import type {
  LearnContext,
  LearnCourseStepResult,
} from "@/lib/xulux/learn/types";
import {
  createLearnSourceSelection,
  resolveLearnSourceStageId,
} from "./learn-source-selection";

const context = (
  currentStepId: string | null,
  selectedStepId: string | null,
): LearnContext => ({
  courseId: "learn-ui-prototype",
  status: currentStepId ? "in_progress" : "not_started",
  currentStepId,
  selectedStepId,
});

describe("Learn source selection", () => {
  it("has no course mount before the first accepted step", () => {
    expect(resolveLearnSourceStageId(context(null, null))).toBeNull();
  });

  it("mounts the current step by default", () => {
    expect(resolveLearnSourceStageId(context("first-change", null))).toBe("P1");
  });

  it("mounts an earlier selected step for review", () => {
    expect(resolveLearnSourceStageId(context("first-change", "welcome"))).toBe(
      "P0",
    );
  });

  it("does not expose a selected step beyond current progress", () => {
    expect(resolveLearnSourceStageId(context("welcome", "first-change"))).toBe(
      "P0",
    );
  });

  it("switches the request-local mount when the course tool returns", () => {
    const selection = createLearnSourceSelection(context(null, null));
    const result = {
      course: { id: "learn-ui-prototype", status: "in_progress" },
      step: {
        id: "welcome",
        title: "Welcome",
        index: 1,
        total: 2,
        content: "Lesson",
      },
      stage: {
        id: "P0",
        previewPath: "/learn/preview/P0",
        downloadUrl: "/download",
        focusFiles: ["app/page.tsx"],
      },
      changes: { files: [], additions: 0, deletions: 0 },
    } satisfies LearnCourseStepResult;

    selection.acceptCourseResult(result);

    expect(selection.getStageId()).toBe("P0");
  });
});
