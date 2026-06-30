import { describe, expect, it } from "vitest";
import { createThreadAssistantMessage } from "./create-thread-assistant-message";

describe("createThreadAssistantMessage", () => {
  it("fills assistant message defaults", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");

    expect(createThreadAssistantMessage({ id: "msg-1", createdAt })).toEqual({
      id: "msg-1",
      role: "assistant",
      content: [],
      status: { type: "running" },
      createdAt,
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    });
  });

  it("preserves provided fields while filling missing metadata defaults", () => {
    const createdAt = new Date("2026-01-02T00:00:00.000Z");
    const timing = {
      streamStartTime: 100,
      totalChunks: 2,
      toolCallCount: 1,
    };

    expect(
      createThreadAssistantMessage({
        id: "msg-2",
        createdAt,
        content: [{ type: "text", text: "hello" }],
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: { step: "done" },
          unstable_annotations: ["annotation"],
          unstable_data: [{ value: 1 }],
          steps: [{ messageId: "step-1" }],
          timing,
          submittedFeedback: { type: "positive" },
          isOptimistic: true,
          custom: { source: "test" },
        },
      }),
    ).toEqual({
      id: "msg-2",
      role: "assistant",
      content: [{ type: "text", text: "hello" }],
      status: { type: "complete", reason: "stop" },
      createdAt,
      metadata: {
        unstable_state: { step: "done" },
        unstable_annotations: ["annotation"],
        unstable_data: [{ value: 1 }],
        steps: [{ messageId: "step-1" }],
        timing,
        submittedFeedback: { type: "positive" },
        isOptimistic: true,
        custom: { source: "test" },
      },
    });
  });
});
