import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudFileAttachmentAdapter } from "../react/runtimes/cloud/CloudFileAttachmentAdapter";
import type { AssistantCloud } from "assistant-cloud";

describe("CloudFileAttachmentAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads video files as video attachments", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null)),
    );
    const adapter = new CloudFileAttachmentAdapter({
      files: {
        generatePresignedUploadUrl: vi.fn(async () => ({
          signedUrl: "https://upload.example.com/video.mp4",
          publicUrl: "https://cdn.example.com/video.mp4",
        })),
      },
    } as unknown as AssistantCloud);

    const attachments = [];
    for await (const attachment of adapter.add({
      file: new File(["video"], "video.mp4", { type: "video/mp4" }),
    })) {
      attachments.push(attachment);
    }

    expect(attachments[0]).toMatchObject({
      type: "video",
      name: "video.mp4",
      contentType: "video/mp4",
    });

    const complete = await adapter.send(attachments[1]!);
    expect(complete.content).toEqual([
      {
        type: "video",
        url: "https://cdn.example.com/video.mp4",
        mimeType: "video/mp4",
        filename: "video.mp4",
      },
    ]);
  });
});
