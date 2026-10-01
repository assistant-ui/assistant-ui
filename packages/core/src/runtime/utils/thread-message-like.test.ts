import { describe, expect, it } from "vitest";
import { fromThreadMessageLike } from "./thread-message-like";

describe("fromThreadMessageLike", () => {
  it.each(["assistant", "user"] as const)(
    "round-trips data-prefixed part ids on %s messages",
    (role) => {
      const message = fromThreadMessageLike(
        {
          role,
          content: [
            { type: "data-workflow", id: "workflow-1", data: { step: 1 } },
            { type: "data-workflow", id: "", data: { step: 2 } },
            { type: "data-workflow", data: { step: 3 } },
          ],
        },
        "message",
        { type: "complete", reason: "unknown" },
      );

      expect(message.content).toEqual([
        { type: "data", id: "workflow-1", name: "workflow", data: { step: 1 } },
        { type: "data", id: "", name: "workflow", data: { step: 2 } },
        { type: "data", name: "workflow", data: { step: 3 } },
      ]);
      expect(message.content[2]).not.toHaveProperty("id");
      expect(
        fromThreadMessageLike(message, "message", {
          type: "complete",
          reason: "unknown",
        }).content,
      ).toEqual(message.content);
    },
  );

  it("round-trips data-prefixed attachment part ids", () => {
    const message = fromThreadMessageLike(
      {
        role: "user",
        content: "hello",
        attachments: [
          {
            id: "attachment",
            type: "file",
            name: "workflow.json",
            status: { type: "complete" },
            content: [
              { type: "data-workflow", id: "workflow-1", data: { step: 1 } },
              { type: "data-workflow", data: { step: 2 } },
            ],
          },
        ],
      },
      "message",
      { type: "complete", reason: "unknown" },
    );

    if (message.role !== "user") throw new Error("expected user");
    expect(message.attachments[0]?.content).toEqual([
      { type: "data", id: "workflow-1", name: "workflow", data: { step: 1 } },
      { type: "data", name: "workflow", data: { step: 2 } },
    ]);
    expect(message.attachments[0]?.content[1]).not.toHaveProperty("id");
    expect(
      fromThreadMessageLike(message, "message", {
        type: "complete",
        reason: "unknown",
      }),
    ).toEqual(message);
  });

  it("preserves modality on user and assistant messages", () => {
    const user = fromThreadMessageLike(
      {
        role: "user",
        content: "Hello",
        metadata: { modality: "voice" },
      },
      "user-id",
      { type: "complete", reason: "unknown" },
    );
    const assistant = fromThreadMessageLike(
      {
        role: "assistant",
        content: "Hi",
        metadata: { modality: "voice" },
      },
      "assistant-id",
      { type: "complete", reason: "unknown" },
    );

    expect(user.metadata.modality).toBe("voice");
    expect(assistant.metadata.modality).toBe("voice");
  });

  it("leaves modality absent when the input has none", () => {
    const message = fromThreadMessageLike(
      { role: "user", content: "Hello" },
      "user-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.metadata).not.toHaveProperty("modality");
  });

  it("ignores modality on system messages", () => {
    const message = fromThreadMessageLike(
      {
        role: "system",
        content: "Instructions",
        metadata: { modality: "voice" },
      },
      "system-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.metadata).not.toHaveProperty("modality");
  });

  it("keeps readable tool-call interactions", () => {
    const message = fromThreadMessageLike(
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "confirm",
            args: {},
            unstable_interactions: {
              entries: [
                {
                  type: "action",
                  occurredAt: 10,
                  payload: { $input: "approve" },
                },
              ],
            },
          },
        ],
      },
      "assistant-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.content[0]).toHaveProperty("unstable_interactions", {
      entries: [
        {
          type: "action",
          occurredAt: 10,
          payload: { $input: "approve" },
        },
      ],
    });
  });

  it("omits unreadable tool-call interactions", () => {
    const message = fromThreadMessageLike(
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "confirm",
            args: {},
            unstable_interactions: { entries: [{ type: "unknown" }] },
          },
        ],
      } as never,
      "assistant-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.content[0]).not.toHaveProperty("unstable_interactions");
  });
});
