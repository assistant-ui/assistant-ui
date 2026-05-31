import { describe, expect, it } from "vitest";
import { auiV0Decode, auiV0Encode } from "../react/runtimes/cloud/auiV0";
import type {
  ThreadAssistantMessage,
  VideoMessagePart,
} from "../types/message";

describe("aui/v0 video parts", () => {
  it("round-trips video message part fields", () => {
    const part: VideoMessagePart = {
      type: "video",
      url: "https://cdn.example.com/video.mp4",
      mimeType: "video/mp4",
      filename: "video.mp4",
      posterUrl: "https://cdn.example.com/poster.jpg",
      width: 1280,
      height: 720,
      durationSeconds: 4,
      providerMetadata: { model: "example" },
      parentId: "tool_1",
    };

    const message: ThreadAssistantMessage = {
      id: "msg_1",
      role: "assistant",
      content: [part],
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      createdAt: new Date(0),
    };

    const encoded = auiV0Encode(message);
    const decoded = auiV0Decode({
      id: "cloud_msg_1",
      parent_id: null,
      created_at: new Date(0),
      format: "aui/v0",
      content: encoded,
    } as any);

    expect(decoded.message.content[0]).toEqual(part);
  });
});
