import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";

import { __test__ } from "./convertMessage";

const { convertParts } = __test__;

describe("convertMessage", () => {
  it("passes through text and tool parts without modifications", () => {
    const message = {
      id: "assistant-plain",
      role: "assistant",
      parts: [
        { type: "text", text: "hello" },
        {
          type: "tool-call",
          toolCallId: "tool-1",
          toolName: "weather",
          state: "output-available",
          input: { location: "sf" },
          output: { temp: "72F" },
        },
      ],
    } as UIMessage;

    const { parts, storedReasoningDurations } = convertParts(message, {});

    expect(parts).toMatchObject([
      { type: "text", text: "hello" },
      {
        type: "tool-call",
        toolCallId: "tool-1",
        result: { temp: "72F" },
      },
    ]);
    expect(storedReasoningDurations).toEqual({});
  });
});
