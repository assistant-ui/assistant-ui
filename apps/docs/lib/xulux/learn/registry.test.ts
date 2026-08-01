import {
  DEFAULT_LEARN_COURSE_ID,
  getLearnCourse,
  getLearnStage,
  getLearnStageForStep,
  LearnRegistryError,
} from "./registry";

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
    expect(() =>
      getLearnStage(DEFAULT_LEARN_COURSE_ID, "missing-stage"),
    ).toThrow(LearnRegistryError);
  });
});
