import { describe, expect, it } from "vitest";
import {
  COURSE_TEACHING_EPILOGUE,
  COURSE_TEACHING_PREAMBLE,
} from "../../course/teaching-wrapper.js";
import { courseInputSchema } from "../course.js";
import { testContext } from "./test-setup.js";

describe("assistantUICourse", () => {
  it("returns the course overview when step is omitted", async () => {
    const result = await testContext.callTool("assistantUICourse", {});
    expect(result.courseTitle).toBe("Build a Generative UI Assistant");
    expect(result.steps).toHaveLength(8);
    expect(result.steps[0]).toEqual({
      step: 1,
      id: "meet-the-project",
      title: "Meet the project",
    });
    expect(result.hint).toContain('step": 1');
  });

  it("wraps each lesson with the exact M0 preamble and epilogue", async () => {
    for (let step = 1; step <= 8; step++) {
      const result = await testContext.callTool("assistantUICourse", { step });
      expect(result.step).toBe(step);
      expect(result.teachingWrapper.startsWith(COURSE_TEACHING_PREAMBLE)).toBe(
        true,
      );
      expect(result.teachingWrapper.endsWith(COURSE_TEACHING_EPILOGUE)).toBe(
        true,
      );
      expect(result.teachingWrapper).toContain(result.lessonMarkdown);
      expect(result.lessonPath).toContain(
        "course/build-generative-ui-assistant/lessons/",
      );
      expect(Array.isArray(result.focusFiles)).toBe(true);
      expect(Array.isArray(result.docsHints)).toBe(true);
      expect(Array.isArray(result.examplesHints)).toBe(true);
    }
  });

  it("returns a structured error for an invalid step", async () => {
    const result = await testContext.callTool("assistantUICourse", {
      step: 9,
    });
    expect(result.error).toBe("Failed to load course");
    expect(result.message).toMatch(/less than or equal to 8|1 to 8|Invalid|Course/i);
  });

  it("rejects unknown fields such as courseId", async () => {
    expect(
      courseInputSchema.safeParse({ step: 1, courseId: "other-course" }).success,
    ).toBe(false);

    const result = await testContext.callTool("assistantUICourse", {
      step: 1,
      courseId: "other-course",
    });
    expect(result.error).toBe("Failed to load course");
    expect(result.message).toMatch(/unrecognized key/i);
  });
});
