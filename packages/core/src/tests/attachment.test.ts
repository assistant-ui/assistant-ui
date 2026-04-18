import { describe, expect, it } from "vitest";
import {
  attachmentsEqual,
  liftNonTextParts,
  partToCompleteAttachment,
} from "../adapters/attachment";
import type { CompleteAttachment } from "../types/attachment";

const makeAttachment = (id: string): CompleteAttachment => ({
  id,
  type: "document",
  name: "file.pdf",
  content: [
    { type: "file", data: "data", mimeType: "application/pdf", filename: id },
  ],
  status: { type: "complete" },
});

describe("attachmentsEqual", () => {
  it("returns true for two empty arrays", () => {
    expect(attachmentsEqual([], [])).toBe(true);
  });

  it("returns false when lengths differ", () => {
    expect(attachmentsEqual([makeAttachment("a")], [])).toBe(false);
  });

  it("returns true when all ids match in order", () => {
    const a = makeAttachment("a");
    const b = makeAttachment("b");
    expect(attachmentsEqual([a, b], [a, b])).toBe(true);
  });

  it("returns false when ids differ at the same length", () => {
    expect(attachmentsEqual([makeAttachment("a")], [makeAttachment("b")])).toBe(
      false,
    );
  });
});

describe("partToCompleteAttachment", () => {
  it("converts an image part using the filename as name", () => {
    const result = partToCompleteAttachment({
      type: "image",
      image: "https://example.com/x.png",
      filename: "x.png",
    });
    expect(result).toMatchObject({
      type: "image",
      name: "x.png",
      status: { type: "complete" },
    });
    expect(result.content).toEqual([
      {
        type: "image",
        image: "https://example.com/x.png",
        filename: "x.png",
      },
    ]);
  });

  it("falls back to 'image' when the image part has no filename", () => {
    const result = partToCompleteAttachment({
      type: "image",
      image: "blob",
    });
    expect(result.name).toBe("image");
  });

  it("converts a file part to a document attachment with contentType", () => {
    const result = partToCompleteAttachment({
      type: "file",
      data: "blob",
      mimeType: "application/pdf",
      filename: "report.pdf",
    });
    expect(result).toMatchObject({
      type: "document",
      name: "report.pdf",
      contentType: "application/pdf",
    });
  });

  it("falls back to 'document' when the file part has no filename", () => {
    const result = partToCompleteAttachment({
      type: "file",
      data: "blob",
      mimeType: "application/pdf",
    });
    expect(result.name).toBe("document");
  });

  it("converts an audio part with derived name and contentType", () => {
    const mp3 = partToCompleteAttachment({
      type: "audio",
      audio: { data: "blob", format: "mp3" },
    });
    expect(mp3).toMatchObject({
      type: "audio",
      name: "audio.mp3",
      contentType: "audio/mp3",
    });

    const wav = partToCompleteAttachment({
      type: "audio",
      audio: { data: "blob", format: "wav" },
    });
    expect(wav.name).toBe("audio.wav");
    expect(wav.contentType).toBe("audio/wav");
  });

  it("converts a data part using its name", () => {
    const result = partToCompleteAttachment({
      type: "data",
      name: "weather-widget",
      data: { temp: 20 },
    });
    expect(result).toMatchObject({
      type: "data",
      name: "weather-widget",
    });
    expect(result.contentType).toBeUndefined();
  });

  it("generates a unique id for each call", () => {
    const a = partToCompleteAttachment({
      type: "file",
      data: "x",
      mimeType: "application/pdf",
    });
    const b = partToCompleteAttachment({
      type: "file",
      data: "x",
      mimeType: "application/pdf",
    });
    expect(a.id).not.toBe(b.id);
  });
});

describe("liftNonTextParts", () => {
  it("returns an empty array for content of only text parts", () => {
    expect(
      liftNonTextParts([
        { type: "text", text: "hello" },
        { type: "text", text: "world" },
      ]),
    ).toEqual([]);
  });

  it("lifts mixed non-text types preserving order", () => {
    const result = liftNonTextParts([
      { type: "text", text: "mix" },
      {
        type: "image",
        image: "url",
        filename: "pic.png",
      },
      {
        type: "file",
        data: "d",
        mimeType: "application/pdf",
        filename: "doc.pdf",
      },
      { type: "audio", audio: { data: "a", format: "mp3" } },
      { type: "data", name: "widget", data: {} },
    ]);
    expect(result.map((a) => a.type)).toEqual([
      "image",
      "document",
      "audio",
      "data",
    ]);
    expect(result.map((a) => a.name)).toEqual([
      "pic.png",
      "doc.pdf",
      "audio.mp3",
      "widget",
    ]);
  });
});
