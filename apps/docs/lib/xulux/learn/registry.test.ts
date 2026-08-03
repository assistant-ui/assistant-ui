import {
  DEFAULT_LEARN_COURSE_ID,
  getLearnCourse,
  getNextStep,
  getLearnStage,
  getLearnStageForStep,
  LearnRegistryError,
} from "./registry";
import { createInitialLearnProgress } from "./progress";
import {
  LEARN_START_MESSAGE,
  shouldAutoStartLearnCourse,
  startLearnCourse,
} from "./session";
import {
  LEARN_SPOTLIGHT_HREF,
  LEARN_SUGGESTION_HREF,
  parseLearnAutoStartSource,
} from "./types";

const COURSE_ID = "build-generative-ui-assistant";

describe("Learn course registry", () => {
  it("resolves every curriculum step to one registered stage", () => {
    const course = getLearnCourse(DEFAULT_LEARN_COURSE_ID);

    expect(
      course.steps.map((step) => getLearnStageForStep(course.id, step.id).id),
    ).toEqual(["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7"]);
  });

  it("keeps preview and source selection on the same stage", () => {
    const stage = getLearnStage(DEFAULT_LEARN_COURSE_ID, "S7");

    expect(stage.previewPath).toBe("/learn/preview/S7");
    expect(stage.sourceRoot).toMatch(
      /build-generative-ui-assistant\/stages\/S7\/project$/,
    );
  });

  it("registers stages as one cumulative sequence", () => {
    const course = getLearnCourse(DEFAULT_LEARN_COURSE_ID);

    expect(
      Object.values(course.stages).map((stage) => stage.previousStageId),
    ).toEqual([undefined, "S0", "S1", "S2", "S3", "S4", "S5", "S6"]);
  });

  it("rejects unregistered course and stage IDs", () => {
    expect(() => getLearnCourse("missing-course")).toThrow(LearnRegistryError);
    expect(() => getLearnCourse("toString")).toThrow(LearnRegistryError);
    expect(() =>
      getLearnStage(DEFAULT_LEARN_COURSE_ID, "missing-stage"),
    ).toThrow(LearnRegistryError);
    expect(() => getLearnStage(DEFAULT_LEARN_COURSE_ID, "toString")).toThrow(
      LearnRegistryError,
    );
  });
});

describe("Learn course flow", () => {
  it("moves from the first step through completion", () => {
    expect(getNextStep(null)).toMatchObject({
      status: "in_progress",
      step: { id: "meet-the-project", stageId: "S0" },
    });
    expect(getNextStep("meet-the-project")).toMatchObject({
      status: "in_progress",
      step: { id: "connect-first-assistant", stageId: "S1" },
    });
    expect(getNextStep("revise-and-branch")).toEqual({ status: "completed" });
  });

  it("keeps progression deterministic and rejects invalid IDs", () => {
    expect(getNextStep("meet-the-project")).toEqual(
      getNextStep("meet-the-project"),
    );
    expect(() => getNextStep(null, "missing-course")).toThrow(
      LearnRegistryError,
    );
    expect(() => getNextStep("missing-step")).toThrow(LearnRegistryError);
  });

  it("starts once with the existing session ID", () => {
    const initial = createInitialLearnProgress(COURSE_ID, 1);
    const first = startLearnCourse(initial, "session-1", 10);

    expect(first.shouldSubmitStartMessage).toBe(true);
    expect(first.progress).toMatchObject({
      threadId: "session-1",
      status: "in_progress",
      startedAt: 10,
      updatedAt: 10,
    });
    expect(startLearnCourse(first.progress, "session-2", 20)).toEqual({
      progress: first.progress,
      shouldSubmitStartMessage: false,
    });
  });

  it("validates explicit and automatic starts", () => {
    const initial = createInitialLearnProgress(COURSE_ID);
    expect(() => startLearnCourse(initial, " ")).toThrow(
      /thread ID is required/,
    );
    expect(shouldAutoStartLearnCourse(initial, true)).toBe(true);
    expect(shouldAutoStartLearnCourse(initial, false)).toBe(false);
    expect(
      shouldAutoStartLearnCourse(
        startLearnCourse(initial, "session-1").progress,
        true,
      ),
    ).toBe(false);
    expect(LEARN_START_MESSAGE).toBe("Start the course.");
  });

  it("attributes Learn entry links and defaults unknown sources safely", () => {
    expect(LEARN_SPOTLIGHT_HREF).toBe("/learn?start=1&source=spotlight");
    expect(LEARN_SUGGESTION_HREF).toBe("/learn?start=1&source=suggestion");
    expect(parseLearnAutoStartSource("spotlight")).toBe("spotlight");
    expect(parseLearnAutoStartSource("suggestion")).toBe("suggestion");
    expect(parseLearnAutoStartSource("footer")).toBe("suggestion");
    expect(parseLearnAutoStartSource(undefined)).toBe("suggestion");
  });
});
