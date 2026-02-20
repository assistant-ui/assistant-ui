import { describe, expect, it } from "vitest";
import type { CloudMessage } from "assistant-cloud";
import type { ThreadMessage } from "@assistant-ui/core";
import {
  decodeAuiMessage,
  encodeAuiMessage,
} from "../legacy-runtime/cloud/auiCodec";

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

describe("auiCodec aui/v1 assistant part fidelity", () => {
  it("round-trips assistant audio and data parts", () => {
    const message: ThreadMessage = {
      id: "m-audio-data",
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
          type: "audio",
          audio: {
            data: "UklGRgAAAQ==",
            format: "wav",
          },
        },
        {
          type: "data",
          name: "status",
          data: {
            ok: true,
            attempts: 2,
          },
        },
      ] as ThreadMessage["content"],
    };

    const encoded = encodeAuiMessage(message, {
      allowComponent: true,
      formatLabel: "aui/v1",
    });

    const decoded = decodeAuiMessage({
      id: "remote-audio-data",
      parent_id: null,
      height: 0,
      created_at: new Date("2025-02-20T00:00:01.000Z"),
      updated_at: new Date("2025-02-20T00:00:01.000Z"),
      format: "aui/v1",
      content: encoded as CloudMessage["content"],
    });

    expect(decoded.message.content).toEqual([
      {
        type: "audio",
        audio: {
          data: "UklGRgAAAQ==",
          format: "wav",
        },
      },
      {
        type: "data",
        name: "status",
        data: {
          ok: true,
          attempts: 2,
        },
      },
    ]);
  });

  it("throws when assistant data part payload is not JSON", () => {
    const message: ThreadMessage = {
      id: "m-invalid-data",
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
          type: "data",
          name: "status",
          data: {
            ok: true,
            invalid: () => "nope",
          },
        },
      ] as ThreadMessage["content"],
    };

    expect(() =>
      encodeAuiMessage(message, {
        allowComponent: true,
        formatLabel: "aui/v1",
      }),
    ).toThrow("Message data part is not JSON");
  });
});
