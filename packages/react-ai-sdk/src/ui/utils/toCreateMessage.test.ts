import { describe, expect, it } from "vitest";
import { toCreateMessage } from "./toCreateMessage";
import type { AppendMessage } from "@assistant-ui/core";

describe("toCreateMessage", () => {
  it("converts video parts to AI SDK file parts", () => {
    const message: AppendMessage = {
      role: "user",
      parentId: null,
      sourceId: null,
      content: [
        {
          type: "video",
          url: "https://cdn.example.com/video.mp4",
          mimeType: "video/mp4",
          filename: "video.mp4",
        },
      ],
      metadata: { custom: {} },
    };

    expect(toCreateMessage(message).parts).toEqual([
      {
        type: "file",
        url: "https://cdn.example.com/video.mp4",
        mediaType: "video/mp4",
        filename: "video.mp4",
      },
    ]);
  });
});
