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
});
