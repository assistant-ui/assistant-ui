import { describe, expect, it } from "vitest";
import type { ToolModelContentPart } from "assistant-stream";
import { toAISDKContent, toAISDKDefaultOutput } from "./toolOutputConversion";

describe("toAISDKContent", () => {
  it("maps a text part to a text entry", () => {
    expect(toAISDKContent([{ type: "text", text: "hi" }])).toEqual({
      type: "content",
      value: [{ type: "text", text: "hi" }],
    });
  });

  it("maps an image file part to a file entry and keeps the filename", () => {
    const parts: ToolModelContentPart[] = [
      {
        type: "file",
        data: "AAAA",
        mediaType: "image/png",
        filename: "shot.png",
      },
    ];
    expect(toAISDKContent(parts)).toEqual({
      type: "content",
      value: [
        {
          type: "file",
          data: { type: "data", data: "AAAA" },
          mediaType: "image/png",
          filename: "shot.png",
        },
      ],
    });
  });

  it("maps a file part without a filename to a file entry", () => {
    const result = toAISDKContent([
      { type: "file", data: "BBBB", mediaType: "application/pdf" },
    ]);
    expect(result.value[0]).toEqual({
      type: "file",
      data: { type: "data", data: "BBBB" },
      mediaType: "application/pdf",
    });
    expect(result.value[0]).not.toHaveProperty("filename");
  });

  it("includes the filename for a file part when present", () => {
    expect(
      toAISDKContent([
        {
          type: "file",
          data: "CCCC",
          mediaType: "application/pdf",
          filename: "report.pdf",
        },
      ]),
    ).toEqual({
      type: "content",
      value: [
        {
          type: "file",
          data: { type: "data", data: "CCCC" },
          mediaType: "application/pdf",
          filename: "report.pdf",
        },
      ],
    });
  });

  it("preserves the order of a mixed parts array", () => {
    const result = toAISDKContent([
      { type: "text", text: "before" },
      { type: "file", data: "II", mediaType: "image/jpeg" },
      { type: "text", text: "after" },
    ]);
    expect(result.value.map((part) => part.type)).toEqual([
      "text",
      "file",
      "text",
    ]);
  });

  it("returns an empty value array for empty input", () => {
    expect(toAISDKContent([])).toEqual({ type: "content", value: [] });
  });

  it("falls back to application/octet-stream when mediaType is missing", () => {
    const parts = [{ type: "file", data: "DDDD" } as any];
    expect(toAISDKContent(parts)).toEqual({
      type: "content",
      value: [
        {
          type: "file",
          data: { type: "data", data: "DDDD" },
          mediaType: "application/octet-stream",
        },
      ],
    });
  });

  it("falls back to application/octet-stream when mediaType is not a string", () => {
    const parts = [{ type: "file", data: "EEEE", mediaType: 42 } as any];
    expect(toAISDKContent(parts)).toEqual({
      type: "content",
      value: [
        {
          type: "file",
          data: { type: "data", data: "EEEE" },
          mediaType: "application/octet-stream",
        },
      ],
    });
  });

  it("does not throw on a part with an unknown type and no mediaType", () => {
    const parts = [{ type: "widget" } as any];
    const result = toAISDKContent(parts);
    expect(result.value[0]).toMatchObject({
      type: "file",
      mediaType: "application/octet-stream",
    });
  });
});

describe("toAISDKDefaultOutput", () => {
  it("wraps a string as text", () => {
    expect(toAISDKDefaultOutput("hello")).toEqual({
      type: "text",
      value: "hello",
    });
  });

  it("wraps non-string values as json", () => {
    expect(toAISDKDefaultOutput({ ok: true })).toEqual({
      type: "json",
      value: { ok: true },
    });
    expect(toAISDKDefaultOutput(42)).toEqual({ type: "json", value: 42 });
    expect(toAISDKDefaultOutput(false)).toEqual({ type: "json", value: false });
  });

  it("normalizes null and undefined to a json null", () => {
    expect(toAISDKDefaultOutput(null)).toEqual({ type: "json", value: null });
    expect(toAISDKDefaultOutput(undefined)).toEqual({
      type: "json",
      value: null,
    });
  });
});
