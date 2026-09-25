import { describe, expect, it } from "vitest";
import type { ThreadMessage, ToolCallMessagePart } from "../../types/message";
import {
  bindExternalStoreMessage,
  getExternalStoreMessages,
} from "./external-store-message";
import { fromThreadMessageLike } from "./thread-message-like";

describe("getExternalStoreMessages", () => {
  const nested = fromThreadMessageLike(
    { role: "assistant", content: "Nested answer" },
    "nested",
    { type: "complete", reason: "stop" },
  );

  it.each([{ messages: [] }, { messages: [nested] }])(
    "reads a tool part's own sources when it contains transcript $messages",
    ({ messages }) => {
      const part: ToolCallMessagePart = {
        type: "tool-call",
        toolCallId: "delegate",
        toolName: "delegate",
        args: {},
        argsText: "{}",
        messages,
      };
      const source = { id: "original-call" };
      bindExternalStoreMessage(part, source);
      expect(getExternalStoreMessages(part)).toEqual([source]);
      expect(getExternalStoreMessages(part)).toBe(
        getExternalStoreMessages(part),
      );
      expect(getExternalStoreMessages({ ...part, messages: [] })).toEqual([
        source,
      ]);
    },
  );

  it("continues to read thread sources from its message array", () => {
    const messages: ThreadMessage[] = [nested];
    const sources = [{ id: "thread-source" }];
    bindExternalStoreMessage(messages, sources);
    expect(getExternalStoreMessages({ messages })).toBe(sources);
  });

  it("does not substitute transcript sources for an unbound tool part", () => {
    const messages: ThreadMessage[] = [nested];
    bindExternalStoreMessage(messages, [{ id: "nested-source" }]);
    const part: ToolCallMessagePart = {
      type: "tool-call",
      toolCallId: "delegate",
      toolName: "delegate",
      args: {},
      argsText: "{}",
      messages,
    };
    expect(getExternalStoreMessages(part)).toEqual([]);
  });

  it("reads sources from a message or a part without a transcript", () => {
    const message = fromThreadMessageLike(
      { role: "user", content: "Hello" },
      "user",
      { type: "complete", reason: "stop" },
    );
    const source = { id: "original-message" };
    bindExternalStoreMessage(message, source);
    bindExternalStoreMessage(message.content[0]!, source);
    expect(getExternalStoreMessages(message)).toEqual([source]);
    expect(getExternalStoreMessages(message.content[0]!)).toEqual([source]);
  });
});
