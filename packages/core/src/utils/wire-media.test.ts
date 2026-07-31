import { describe, expect, it } from "vitest";
import {
  resolveFileMediaType,
  resolveImageMediaType,
  toMediaWireUrl,
} from "./wire-media";

const JPEG = "/9j/4AAQSkZJRg==";

describe("resolveImageMediaType", () => {
  it("prefers an image content type over everything else", () => {
    expect(
      resolveImageMediaType(`data:image/png;base64,${JPEG}`, "image/webp"),
    ).toBe("image/webp");
  });

  it("ignores a content type that is not an image", () => {
    expect(resolveImageMediaType(JPEG, "application/octet-stream")).toBe(
      "image/jpeg",
    );
  });

  it("takes the data url declaration when it is an image type", () => {
    expect(
      resolveImageMediaType("data:image/svg+xml,%3Csvg%3E%3C/svg%3E"),
    ).toBe("image/svg+xml");
  });

  it("sniffs through a declaration that is not an image type", () => {
    expect(
      resolveImageMediaType(`data:application/octet-stream;base64,${JPEG}`),
    ).toBe("image/jpeg");
  });

  it("sniffs a bare base64 payload", () => {
    expect(resolveImageMediaType(JPEG)).toBe("image/jpeg");
  });

  it("floors to image/png when there are no bytes to read", () => {
    expect(resolveImageMediaType("https://cdn.example.com/photo")).toBe(
      "image/png",
    );
  });

  it("floors to image/png when the bytes match no signature", () => {
    expect(resolveImageMediaType("QUJD")).toBe("image/png");
  });
});

describe("resolveFileMediaType", () => {
  it("prefers the declared type", () => {
    expect(
      resolveFileMediaType(
        "data:application/octet-stream;base64,QUJD",
        "application/pdf",
      ),
    ).toBe("application/pdf");
  });

  it("falls back to the data url declaration when none is declared", () => {
    expect(resolveFileMediaType("data:text/plain,hello", "")).toBe(
      "text/plain",
    );
  });

  it("floors to application/octet-stream", () => {
    expect(resolveFileMediaType("QUJD", "")).toBe("application/octet-stream");
  });
});

describe("toMediaWireUrl", () => {
  it("forwards an envelope that agrees byte for byte", () => {
    const payload = "data:image/jpeg;base64,QUJD";
    expect(toMediaWireUrl(payload, "image/jpeg")).toBe(payload);
  });

  it("rebuilds an envelope that disagrees", () => {
    expect(
      toMediaWireUrl("data:application/octet-stream;base64,QUJD", "image/jpeg"),
    ).toBe("data:image/jpeg;base64,QUJD");
  });

  it("wraps a bare base64 payload", () => {
    expect(toMediaWireUrl("QUJD", "application/pdf")).toBe(
      "data:application/pdf;base64,QUJD",
    );
  });

  it.each([
    "https://cdn.example.com/a.pdf",
    "blob:https://app.example/1-2-3",
    "data:text/plain,hello",
  ])("forwards %s untouched", (payload) => {
    expect(toMediaWireUrl(payload, "application/pdf")).toBe(payload);
  });
});
