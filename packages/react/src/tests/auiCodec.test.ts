import { describe, expect, it } from "vitest";
import type { ThreadMessage } from "@assistant-ui/core";
import { encodeAuiMessage } from "../legacy-runtime/cloud/auiCodec";

const createAssistantMessage = (result: unknown): ThreadMessage => ({
  id: "m-1",
  role: "assistant",
  createdAt: new Date("2025-02-20T00:00:00.000Z"),
  status: { type: "complete", reason: "unknown" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
  content: [
    {
      type: "tool-call",
      toolCallId: "tool-call-1",
      toolName: "echo",
      args: {},
      argsText: "{}",
      result,
    },
  ],
});

describe("auiCodec tool-call serialization", () => {
  it.each([
    ["false", false],
    ["zero", 0],
    ["empty string", ""],
    ["null", null],
  ] as const)("keeps %s results", (_, result) => {
    const encoded = encodeAuiMessage(createAssistantMessage(result), {
      allowComponent: false,
      formatLabel: "aui/v1",
    });

    const toolCallPart = encoded.content.find(
      (part) => part.type === "tool-call",
    );

    expect(toolCallPart).toBeDefined();
    expect(toolCallPart).toHaveProperty("result", result);
  });
});
