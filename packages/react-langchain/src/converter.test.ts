import { describe, expect, it } from "vitest";
import { convertLangChainContentBlock } from "./converter";

describe("convertLangChainContentBlock standard content blocks", () => {
  it("converts a base64 image block to an image part", () => {
    expect(
      convertLangChainContentBlock({
        type: "image",
        mimeType: "image/png",
        data: "ZmFrZQ==",
      }),
    ).toEqual({ type: "image", image: "data:image/png;base64,ZmFrZQ==" });
  });

  it("converts a url image block to an image part", () => {
    expect(
      convertLangChainContentBlock({
        type: "image",
        mimeType: "image/png",
        url: "https://cdn.example/a.png",
      }),
    ).toEqual({ type: "image", image: "https://cdn.example/a.png" });
  });

  it("keeps a base64 image block that already carries a data url", () => {
    expect(
      convertLangChainContentBlock({
        type: "image",
        mimeType: "image/png",
        data: "data:image/png;base64,ZmFrZQ==",
      }),
    ).toEqual({ type: "image", image: "data:image/png;base64,ZmFrZQ==" });
  });

  it("keeps a percent-encoded data url out of a base64 envelope", () => {
    const image = "data:image/svg+xml,%3Csvg%3E%3C/svg%3E";
    expect(
      convertLangChainContentBlock({
        type: "image",
        mimeType: "image/svg+xml",
        data: image,
      }),
    ).toEqual({ type: "image", image });
  });

  it("keeps an uppercase data url scheme out of a base64 envelope", () => {
    const image = "DATA:image/png;base64,ZmFrZQ==";
    expect(
      convertLangChainContentBlock({
        type: "image",
        mimeType: "image/png",
        data: image,
      }),
    ).toEqual({ type: "image", image });
  });

  it("reads the camelCase mime type of a base64 file block", () => {
    expect(
      convertLangChainContentBlock({
        type: "file",
        mimeType: "application/pdf",
        data: "JVBERi0=",
      }),
    ).toEqual({
      type: "file",
      filename: "file",
      data: "JVBERi0=",
      mimeType: "application/pdf",
    });
  });

  it("resolves the url of a file block that carries no source_type", () => {
    expect(
      convertLangChainContentBlock({
        type: "file",
        mimeType: "application/pdf",
        url: "https://cdn.example/a.pdf",
        metadata: { filename: "a.pdf" },
      }),
    ).toEqual({
      type: "file",
      filename: "a.pdf",
      data: "https://cdn.example/a.pdf",
      mimeType: "application/pdf",
      sourceType: "url",
    });
  });

  it("resolves the fileId of a file block as an id source", () => {
    expect(
      convertLangChainContentBlock({
        type: "file",
        mimeType: "application/pdf",
        fileId: "file-abc123",
      }),
    ).toEqual({
      type: "file",
      filename: "file",
      data: "file-abc123",
      mimeType: "application/pdf",
      sourceType: "id",
    });
  });

  it("converts a video block to a file part", () => {
    expect(
      convertLangChainContentBlock({
        type: "video",
        mimeType: "video/mp4",
        data: "ZmFrZQ==",
      }),
    ).toEqual({
      type: "file",
      filename: "video.mp4",
      data: "ZmFrZQ==",
      mimeType: "video/mp4",
    });
  });

  it("converts an audio block that names its mime type in camelCase", () => {
    expect(
      convertLangChainContentBlock({
        type: "audio",
        mimeType: "audio/wav",
        data: "ZmFrZQ==",
      }),
    ).toEqual({
      type: "file",
      filename: "audio.wav",
      data: "ZmFrZQ==",
      mimeType: "audio/wav",
    });
  });

  it("converts a text-plain block to a file part", () => {
    expect(
      convertLangChainContentBlock({
        type: "text-plain",
        data: "ZmFrZQ==",
        metadata: { filename: "notes.txt" },
      }),
    ).toEqual({
      type: "file",
      filename: "notes.txt",
      data: "ZmFrZQ==",
      mimeType: "text/plain",
    });
  });

  it("falls back to a file part for an image referenced by id", () => {
    expect(
      convertLangChainContentBlock({
        type: "image",
        mimeType: "image/png",
        fileId: "file-abc123",
      }),
    ).toEqual({
      type: "file",
      filename: "file",
      data: "file-abc123",
      mimeType: "image/png",
      sourceType: "id",
    });
  });

  it("falls back to a file part for a base64 image with no mime type", () => {
    expect(
      convertLangChainContentBlock({ type: "image", data: "ZmFrZQ==" }),
    ).toEqual({
      type: "file",
      filename: "file",
      data: "ZmFrZQ==",
      mimeType: "application/octet-stream",
    });
  });

  it("reports a block whose payload is not a string as unknown", () => {
    expect(
      convertLangChainContentBlock({
        type: "image",
        mimeType: "image/png",
        data: new Uint8Array([1, 2, 3]),
      }),
    ).toBeUndefined();
  });

  it("reports a text-plain block carrying only inline text as unknown", () => {
    expect(
      convertLangChainContentBlock({
        type: "text-plain",
        text: "hello",
      }),
    ).toBeUndefined();
  });
});

describe("convertLangChainContentBlock legacy data content blocks", () => {
  it("converts a base64 file block that names its mime type in snake_case", () => {
    expect(
      convertLangChainContentBlock({
        type: "file",
        data: "JVBERi0=",
        mime_type: "application/pdf",
        source_type: "base64",
        metadata: { filename: "a.pdf" },
      }),
    ).toEqual({
      type: "file",
      filename: "a.pdf",
      data: "JVBERi0=",
      mimeType: "application/pdf",
    });
  });

  it("converts a url source file block", () => {
    expect(
      convertLangChainContentBlock({
        type: "file",
        url: "https://cdn.example/a.pdf",
        mime_type: "application/pdf",
        source_type: "url",
      }),
    ).toEqual({
      type: "file",
      filename: "file",
      data: "https://cdn.example/a.pdf",
      mimeType: "application/pdf",
      sourceType: "url",
    });
  });

  it("converts an id source file block", () => {
    expect(
      convertLangChainContentBlock({
        type: "file",
        id: "file-abc123",
        source_type: "id",
      }),
    ).toEqual({
      type: "file",
      filename: "file",
      data: "file-abc123",
      mimeType: "application/octet-stream",
      sourceType: "id",
    });
  });

  it("converts a base64 audio block", () => {
    expect(
      convertLangChainContentBlock({
        type: "audio",
        data: "ZmFrZQ==",
        mime_type: "audio/mp3",
        source_type: "base64",
      }),
    ).toEqual({
      type: "file",
      filename: "audio.mp3",
      data: "ZmFrZQ==",
      mimeType: "audio/mp3",
    });
  });

  it("converts a base64 image data block", () => {
    expect(
      convertLangChainContentBlock({
        type: "image",
        data: "ZmFrZQ==",
        mime_type: "image/png",
        source_type: "base64",
      }),
    ).toEqual({ type: "image", image: "data:image/png;base64,ZmFrZQ==" });
  });

  it("leaves an unknown block type unconverted", () => {
    expect(
      convertLangChainContentBlock({
        type: "non_standard",
      } as never),
    ).toBeUndefined();
  });
});
