import { describe, expect, it } from "vitest";
import type { AppendMessage } from "@assistant-ui/core";
import { toCreateMessage } from "./toCreateMessage";

const baseMessage = {
  role: "user",
  parentId: null,
  sourceId: null,
  runConfig: undefined,
  metadata: undefined,
} as const;

describe("toCreateMessage", () => {
  it("preserves the media type from image data URLs", () => {
    const message = {
      ...baseMessage,
      content: [
        {
          type: "image",
          image: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
          filename: "photo.jpg",
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "file",
        url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        filename: "photo.jpg",
        mediaType: "image/jpeg",
      },
    ]);
  });

  it("uses attachment contentType for image attachments", () => {
    const message = {
      ...baseMessage,
      content: [],
      attachments: [
        {
          id: "some-id",
          type: "image",
          name: "photo.webp",
          contentType: "image/webp",
          status: { type: "complete" },
          content: [
            {
              type: "image",
              image: "https://cdn.example.com/photo",
            },
          ],
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "file",
        url: "https://cdn.example.com/photo",
        filename: "photo.webp",
        mediaType: "image/webp",
      },
    ]);
  });

  it("falls back to image/png for images without a known media type", () => {
    const message = {
      ...baseMessage,
      content: [
        {
          type: "image",
          image: "https://cdn.example.com/photo",
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "file",
        url: "https://cdn.example.com/photo",
        mediaType: "image/png",
      },
    ]);
  });

  it("converts a data part in message content into a data-<name> part", () => {
    const message = {
      ...baseMessage,
      content: [{ type: "data", name: "workflow", data: { field: 1 } }],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      { type: "data-workflow", data: { field: 1 } },
    ]);
  });

  it("converts a data part inside an attachment without throwing", () => {
    const message = {
      ...baseMessage,
      content: [],
      attachments: [
        {
          id: "some-id",
          type: "document",
          name: "some-name",
          status: { type: "complete" },
          content: [
            {
              type: "data",
              name: "some-content-name",
              data: { field: 1 },
            },
          ],
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      { type: "data-some-content-name", data: { field: 1 } },
    ]);
  });
});
