import { describe, expect, it } from "vitest";
import { parseAttachment } from "./parseAttachment";

describe("parseAttachment", () => {
  it("parses name, kind, contentType, and status", () => {
    expect(
      parseAttachment({
        id: "a1",
        name: "photo.png",
        type: "image",
        contentType: "image/png",
        status: { type: "complete" },
      }),
    ).toMatchObject({
      id: "a1",
      name: "photo.png",
      kind: "image",
      contentType: "image/png",
      status: { type: "complete" },
    });
  });

  it("extracts image preview and size from content parts", () => {
    const result = parseAttachment({
      name: "shot.png",
      type: "image",
      content: [
        {
          type: "image",
          image: "data:image/png;base64,abcd",
        },
      ],
    });
    expect(result?.previewUrl).toBe("data:image/png;base64,abcd");
    expect(result?.sizeBytes).toBeGreaterThan(0);
  });

  it("extracts preview and size for an uppercase data: scheme", () => {
    const result = parseAttachment({
      name: "shot.png",
      type: "image",
      content: [
        {
          type: "image",
          image: "DATA:IMAGE/PNG;base64,abcd",
        },
      ],
    });
    expect(result?.previewUrl).toBe("DATA:IMAGE/PNG;base64,abcd");
    expect(result?.sizeBytes).toBeGreaterThan(0);
  });

  it("accepts an uppercase HTTPS preview URL without a size estimate", () => {
    const result = parseAttachment({
      name: "remote.png",
      type: "image",
      image: "HTTPS://example.com/pic.png",
    });
    expect(result?.previewUrl).toBe("HTTPS://example.com/pic.png");
    expect(result?.sizeBytes).toBeUndefined();
  });
});
