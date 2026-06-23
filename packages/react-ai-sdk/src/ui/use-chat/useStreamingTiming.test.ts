import { describe, expect, it } from "vitest";
import type { UIMessage } from "@ai-sdk/react";
import { aiSdkStreamingTimingAccessors } from "./useStreamingTiming";

const assistant = (id: string, parts: UIMessage["parts"]): UIMessage => ({
  id,
  role: "assistant",
  parts,
});

const user = (id: string, text: string): UIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text }],
});

const { getAssistantMessageId, getTextLength, getToolCallCount } =
  aiSdkStreamingTimingAccessors;

describe("aiSdkStreamingTimingAccessors", () => {
  it("resolves the last assistant message id", () => {
    expect(getAssistantMessageId([user("u1", "hi"), assistant("a1", [])])).toBe(
      "a1",
    );
    expect(
      getAssistantMessageId([
        assistant("a1", [{ type: "text", text: "x" }]),
        user("u2", "hi"),
        assistant("a2", [{ type: "text", text: "y" }]),
      ]),
    ).toBe("a2");
  });

  it("returns undefined when there is no assistant message", () => {
    expect(getAssistantMessageId([user("u1", "hi")])).toBeUndefined();
  });

  it("sums text part lengths", () => {
    expect(
      getTextLength([assistant("a1", [{ type: "text", text: "hello" }])], "a1"),
    ).toBe(5);
    expect(
      getTextLength(
        [
          assistant("a1", [
            { type: "text", text: "ab" },
            { type: "text", text: "cde" },
          ]),
        ],
        "a1",
      ),
    ).toBe(5);
  });

  it("counts tool UI parts", () => {
    expect(
      getToolCallCount(
        [
          assistant("a1", [
            {
              type: "tool-search",
              toolCallId: "tc-1",
              state: "input-available",
              input: { q: "x" },
            },
            {
              type: "tool-fetch",
              toolCallId: "tc-2",
              state: "output-available",
              input: { url: "y" },
              output: { ok: true },
            },
          ]),
        ],
        "a1",
      ),
    ).toBe(2);
  });

  it("returns 0 when the message is missing or has no parts", () => {
    expect(getTextLength([user("u1", "hi")], "a1")).toBe(0);
    expect(getToolCallCount([assistant("a1", [])], "a1")).toBe(0);
  });
});
