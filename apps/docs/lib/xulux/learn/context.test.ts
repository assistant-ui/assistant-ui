import { parseLearnContext, toLearnContext } from "./context";
import { createInitialLearnProgress } from "./progress";

describe("Learn context", () => {
  it("accepts the compact registered context", () => {
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
  });

  it.each([
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
  ])("rejects invalid context %#", (value) => {
    expect(parseLearnContext(value)).toBeNull();
  });
});
