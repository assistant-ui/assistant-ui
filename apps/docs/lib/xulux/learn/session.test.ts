import { createInitialLearnProgress } from "./progress";
import {
  LEARN_START_MESSAGE,
  shouldAutoStartLearnCourse,
  startLearnCourse,
} from "./session";

const COURSE_ID = "build-generative-ui-assistant";

describe("Learn course session", () => {
  it("starts the course once with the existing session ID", () => {
    const initial = createInitialLearnProgress(COURSE_ID, 1);
    const first = startLearnCourse(initial, "session-1", 10);

    expect(first.shouldSubmitStartMessage).toBe(true);
    expect(first.progress).toMatchObject({
      threadId: "session-1",
      status: "in_progress",
      startedAt: 10,
      updatedAt: 10,
    });

    const repeated = startLearnCourse(first.progress, "session-2", 20);
    expect(repeated).toEqual({
      progress: first.progress,
      shouldSubmitStartMessage: false,
    });
  });

  it("rejects an empty thread ID", () => {
    expect(() =>
      startLearnCourse(createInitialLearnProgress(COURSE_ID), " "),
    ).toThrow(/thread ID is required/);
  });

  it("auto-starts only a not-started course", () => {
    const initial = createInitialLearnProgress(COURSE_ID);
    expect(shouldAutoStartLearnCourse(initial, true)).toBe(true);
    expect(shouldAutoStartLearnCourse(initial, false)).toBe(false);

    const active = startLearnCourse(initial, "session-1").progress;
    expect(shouldAutoStartLearnCourse(active, true)).toBe(false);
  });

  it("uses one canonical start message", () => {
    expect(LEARN_START_MESSAGE).toBe("Start the course.");
  });
});
