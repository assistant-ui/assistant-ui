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
  it("converts a direct file part in message content", () => {
    const message = {
      ...baseMessage,
      content: [
        {
          type: "file",
          data: "data:application/pdf;base64,JVBERi0xLjQ=",
          mimeType: "application/pdf",
          filename: "invoice.pdf",
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "file",
        url: "data:application/pdf;base64,JVBERi0xLjQ=",
        mediaType: "application/pdf",
        filename: "invoice.pdf",
      },
    ]);
  });

  it("preserves text and direct file parts together", () => {
    const message = {
      ...baseMessage,
      content: [
        {
          type: "text",
          text: "Summarize this invoice and list the due date.",
        },
        {
          type: "file",
          data: "data:application/pdf;base64,JVBERi0xLjQ=",
          mimeType: "application/pdf",
          filename: "invoice.pdf",
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "text",
        text: "Summarize this invoice and list the due date.",
      },
      {
        type: "file",
        url: "data:application/pdf;base64,JVBERi0xLjQ=",
        mediaType: "application/pdf",
        filename: "invoice.pdf",
      },
    ]);
  });

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

  it("infers a lowercase media type from uppercase-scheme image data URLs", () => {
    const message = {
      ...baseMessage,
      content: [
        {
          type: "image",
          image: "DATA:IMAGE/JPEG;base64,/9j/4AAQSkZJRg==",
          filename: "photo.jpg",
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "file",
        url: "DATA:IMAGE/JPEG;base64,/9j/4AAQSkZJRg==",
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

  it("keeps converting attachment file content", () => {
    const message = {
      ...baseMessage,
      content: [],
      attachments: [
        {
          id: "some-id",
          type: "document",
          name: "invoice.pdf",
          contentType: "application/pdf",
          status: { type: "complete" },
          content: [
            {
              type: "file",
              data: "data:application/pdf;base64,JVBERi0xLjQ=",
              mimeType: "application/pdf",
            },
          ],
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "file",
        url: "data:application/pdf;base64,JVBERi0xLjQ=",
        mediaType: "application/pdf",
        filename: "invoice.pdf",
      },
    ]);
  });

  it("converts an audio part into a file part with the format-derived media type", () => {
    const message = {
      ...baseMessage,
      content: [{ type: "audio", audio: { data: "QUJD", format: "mp3" } }],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "file",
        url: "data:audio/mp3;base64,QUJD",
        mediaType: "audio/mp3",
      },
    ]);
  });

  it("converts a wav audio part", () => {
    const message = {
      ...baseMessage,
      content: [{ type: "audio", audio: { data: "QUJD", format: "wav" } }],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "file",
        url: "data:audio/wav;base64,QUJD",
        mediaType: "audio/wav",
      },
    ]);
  });

  it("rebuilds the audio data URL envelope from the typed format", () => {
    const message = {
      ...baseMessage,
      content: [
        {
          type: "audio",
          audio: { data: "data:audio/mpeg;base64,QUJD", format: "mp3" },
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "file",
        url: "data:audio/mp3;base64,QUJD",
        mediaType: "audio/mp3",
      },
    ]);
  });

  it("forwards an http audio source instead of wrapping it in a data URL", () => {
    const message = {
      ...baseMessage,
      content: [
        {
          type: "audio",
          audio: { data: "https://cdn.example.com/memo.mp3", format: "mp3" },
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "file",
        url: "https://cdn.example.com/memo.mp3",
        mediaType: "audio/mp3",
      },
    ]);
  });

  it("keeps the attachment name on audio attachment content", () => {
    const message = {
      ...baseMessage,
      content: [],
      attachments: [
        {
          id: "some-id",
          type: "audio",
          name: "audio.mp3",
          contentType: "audio/mp3",
          status: { type: "complete" },
          content: [{ type: "audio", audio: { data: "QUJD", format: "mp3" } }],
        },
      ],
    } as unknown as AppendMessage;

    const result = toCreateMessage(message);

    expect(result.parts).toEqual([
      {
        type: "file",
        url: "data:audio/mp3;base64,QUJD",
        mediaType: "audio/mp3",
        filename: "audio.mp3",
      },
    ]);
  });
});
