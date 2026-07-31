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
  courseId: "build-generative-ui-assistant",
  status: currentStepId ? "in_progress" : "not_started",
  currentStepId,
  selectedStepId,
});

describe("Learn source selection", () => {
  it("has no course mount before the first accepted step", () => {
    expect(resolveLearnSourceStageId(context(null, null))).toBeNull();
  });

  it("mounts the current step by default", () => {
    expect(
      resolveLearnSourceStageId(context("guide-first-message", null)),
    ).toBe("S2");
  });

  it("mounts an earlier selected step for review", () => {
    expect(
      resolveLearnSourceStageId(
        context("guide-first-message", "meet-the-project"),
      ),
    ).toBe("S0");
  });

  it("does not expose a selected step beyond current progress", () => {
    expect(
      resolveLearnSourceStageId(
        context("meet-the-project", "guide-first-message"),
      ),
    ).toBe("S0");
  });

  it("switches the request-local mount when the course tool returns", () => {
    const selection = createLearnSourceSelection(context(null, null));
    const result = {
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
    } satisfies LearnCourseStepResult;

    selection.acceptCourseResult(result);

    expect(selection.getStageId()).toBe("S0");
  });
});
