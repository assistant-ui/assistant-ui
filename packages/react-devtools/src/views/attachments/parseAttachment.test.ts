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
});
