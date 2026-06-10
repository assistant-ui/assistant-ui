import { describe, it, expect } from "vitest";
import { getThreadMessageText } from "../utils/text";
import type { ThreadMessage } from "../types/message";

const messageWith = (content: ThreadMessage["content"]): ThreadMessage =>
  ({ content }) as ThreadMessage;

describe("getThreadMessageText", () => {
  it("joins text parts with a blank line", () => {
    const message = messageWith([
      { type: "text", text: "Hello" },
      { type: "text", text: "world" },
    ]);

    expect(getThreadMessageText(message)).toBe("Hello\n\nworld");
  });

  it("excludes reasoning parts even though they carry a text field", () => {
    const message = messageWith([
      { type: "reasoning", text: "thinking out loud" },
      { type: "text", text: "The answer is 42." },
    ]);

    expect(getThreadMessageText(message)).toBe("The answer is 42.");
  });

  it("ignores non-text parts", () => {
    const message = messageWith([
      { type: "tool-call", toolCallId: "1", toolName: "search", args: {} },
      { type: "text", text: "done" },
    ]);

    expect(getThreadMessageText(message)).toBe("done");
  });
});
