import type {
  LearnContext,
  LearnCourseStepResult,
} from "@/lib/xulux/learn/types";
import {
  createLearnSourceSelection,
  normalizeLearnSourcePath,
  resolveLearnSourceStageId,
} from "./learn-source-map-tools";

describe("Learn source-map paths", () => {
  it("accepts paths relative to the selected mount", () => {
    expect(normalizeLearnSourcePath("app/page.tsx", "course")).toBe(
      "app/page.tsx",
    );
    expect(normalizeLearnSourcePath("/course/app/page.tsx", "course")).toBe(
      "app/page.tsx",
    );
    expect(normalizeLearnSourcePath("\\repo\\packages\\core.ts", "repo")).toBe(
      "packages/core.ts",
    );
  });

  it("rejects empty and traversal paths", () => {
    expect(normalizeLearnSourcePath("/course", "course")).toBeNull();
    expect(
      normalizeLearnSourcePath("/course/../repo/secret.ts", "course"),
    ).toBeNull();
  });
});

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
  it.each([
    [null, null, null],
    ["guide-first-message", null, "S2"],
    ["guide-first-message", "meet-the-project", "S0"],
    ["meet-the-project", "guide-first-message", "S0"],
  ])("selects the allowed stage for %s / %s", (current, selected, stage) => {
    expect(resolveLearnSourceStageId(context(current, selected))).toBe(stage);
  });

  it("switches the request-local mount when the course advances", () => {
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
