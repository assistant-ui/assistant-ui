import { describe, expect, it } from "vitest";
import { fromThreadMessageLike } from "./thread-message-like";

describe("fromThreadMessageLike", () => {
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

  it("gives a reasoning part that carries only a summary an empty text", () => {
    const message = fromThreadMessageLike(
      {
        role: "assistant",
        content: [{ type: "reasoning", unstable_summary: "Searching" }],
      } as never,
      "assistant-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.content).toEqual([
      { type: "reasoning", text: "", unstable_summary: "Searching" },
    ]);
  });

  it("drops a user text part without text", () => {
    const message = fromThreadMessageLike(
      {
        role: "user",
        content: [{ type: "text" }, { type: "text", text: "hi" }],
      } as never,
      "user-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.content).toEqual([{ type: "text", text: "hi" }]);
  });

  it("reads a user attachment without content as one with no parts", () => {
    const message = fromThreadMessageLike(
      {
        role: "user",
        content: "hi",
        attachments: [
          {
            id: "a",
            type: "document",
            name: "notes.pdf",
            status: { type: "complete" },
          },
        ],
      } as never,
      "user-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.role === "user" && message.attachments).toEqual([
      expect.objectContaining({ id: "a", content: [] }),
    ]);
  });

  it.each(["assistant", "user"] as const)(
    "rejects a part without a type as unsupported in a %s message",
    (role) => {
      expect(() =>
        fromThreadMessageLike(
          { role, content: [{ text: "x" }] } as never,
          "message-id",
          { type: "complete", reason: "unknown" },
        ),
      ).toThrow(`Unsupported ${role} message part type: undefined`);
    },
  );
});
