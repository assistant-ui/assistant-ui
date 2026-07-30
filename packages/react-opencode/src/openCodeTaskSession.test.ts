import { describe, expect, it } from "vitest";
import { getOpenCodeTaskSessionId } from "./openCodeTaskSession";

const taskPart = (overrides: Record<string, unknown>) =>
  ({
    type: "tool",
    tool: "task",
    state: { status: "running" },
    ...overrides,
  }) as never;

describe("getOpenCodeTaskSessionId", () => {
  it.each([
    [
      "state metadata sessionId",
      taskPart({ state: { status: "running", metadata: { sessionId: "a" } } }),
      "a",
    ],
    [
      "state metadata sessionID",
      taskPart({ state: { status: "running", metadata: { sessionID: "b" } } }),
      "b",
    ],
    [
      "part metadata sessionId",
      taskPart({ metadata: { sessionId: "c" } }),
      "c",
    ],
    [
      "part metadata sessionID",
      taskPart({ metadata: { sessionID: "d" } }),
      "d",
    ],
  ])("reads %s", (_name, part, expected) => {
    expect(getOpenCodeTaskSessionId(part)).toBe(expected);
  });

  it("ignores non-Task tools and invalid metadata", () => {
    expect(
      getOpenCodeTaskSessionId(
        taskPart({ tool: "read", metadata: { sessionId: "child" } }),
      ),
    ).toBeUndefined();
    expect(
      getOpenCodeTaskSessionId(taskPart({ metadata: { sessionId: 42 } })),
    ).toBeUndefined();
  });

  it("reads a Task part whose state is absent", () => {
    expect(
      getOpenCodeTaskSessionId(taskPart({ state: undefined })),
    ).toBeUndefined();
    expect(
      getOpenCodeTaskSessionId(
        taskPart({ state: undefined, metadata: { sessionId: "child" } }),
      ),
    ).toBe("child");
  });
});
