import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  CoreChatModelRunResult,
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  VideoMessagePart,
} from "..";
import type {
  VideoMessagePartComponent,
  VideoMessagePartProps,
} from "../react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";

describe("VideoMessagePart", () => {
  it("has the expected completed video shape", () => {
    const part: VideoMessagePart = {
      type: "video",
      url: "https://cdn.example.com/video.mp4",
      mimeType: "video/mp4",
      filename: "output.mp4",
      posterUrl: "https://cdn.example.com/poster.jpg",
      width: 1280,
      height: 720,
      durationSeconds: 4,
      providerMetadata: { model: "example-video-model" },
      parentId: "tool_1",
    };

    expectTypeOf(part.providerMetadata).toMatchTypeOf<
      ReadonlyJSONObject | undefined
    >();
  });

  it("is assignable to user and assistant message parts", () => {
    const part: VideoMessagePart = {
      type: "video",
      url: "/api/videos/vid_123",
    };

    const userPart: ThreadUserMessagePart = part;
    const assistantPart: ThreadAssistantMessagePart = part;

    expectTypeOf(userPart).toMatchTypeOf<ThreadUserMessagePart>();
    expectTypeOf(assistantPart).toMatchTypeOf<ThreadAssistantMessagePart>();
  });

  it("is allowed in core chat model run results", () => {
    const result: CoreChatModelRunResult = {
      content: [
        {
          type: "video",
          url: "https://cdn.example.com/video.mp4",
        },
      ],
    };

    expect(result.content[0]).toMatchObject({
      type: "video",
      url: "https://cdn.example.com/video.mp4",
    });
  });

  it("has core React component props for video parts", () => {
    const Video: VideoMessagePartComponent = (props) => {
      expectTypeOf(props).toMatchTypeOf<VideoMessagePartProps>();
      return null;
    };

    expectTypeOf(Video).toMatchTypeOf<VideoMessagePartComponent>();
  });
});
