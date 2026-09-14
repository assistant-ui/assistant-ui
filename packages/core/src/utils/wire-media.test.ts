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

  it("ignores a wildcard image content type", () => {
    expect(resolveImageMediaType(JPEG, "image/*")).toBe("image/jpeg");
  });

  it("ignores a wildcard data url media type", () => {
    expect(resolveImageMediaType(`data:image/*;base64,${JPEG}`)).toBe(
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

  it("sniffs image bytes when a data URL omits its media type", () => {
    expect(resolveImageMediaType(`data:;base64,${JPEG}`)).toBe("image/jpeg");
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

  it.each(["data:;base64,QUJD", "data:;charset=utf-8;base64,QUJD"])(
    "uses the binary default for media-less base64 %s",
    (data) => {
      expect(resolveFileMediaType(data, "")).toBe("application/octet-stream");
    },
  );

  it("uses the text default for media-less non-base64 data", () => {
    expect(resolveFileMediaType("data:;charset=utf-8,hello", "")).toBe(
      "text/plain",
    );
  });

  it("prefers the supplied type over the data URL default", () => {
    expect(resolveFileMediaType("data:;base64,QUJD", "application/pdf")).toBe(
      "application/pdf",
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

  it.each(["data:;base64,QUJD", "data:;charset=utf-8;base64,"])(
    "stamps the binary default onto media-less base64 %s",
    (payload) => {
      expect(toMediaWireUrl(payload, "application/octet-stream")).toBe(
        `data:application/octet-stream;base64,${payload.split(",")[1]}`,
      );
    },
  );

  it.each([
    ["data:,hello", "data:text/plain,hello"],
    ["data:;charset=utf-8,hello", "data:text/plain;charset=utf-8,hello"],
  ])("stamps a media-less percent-encoded URL %s", (payload, expected) => {
    expect(toMediaWireUrl(payload, "text/plain")).toBe(expected);
  });

  it.each(["data:;base64,QUJD", "data:;charset=utf-8;base64,"])(
    "rebuilds %s when the wire type disagrees with the binary default",
    (payload) => {
      expect(toMediaWireUrl(payload, "text/plain")).toBe(
        `data:text/plain;base64,${payload.split(",")[1]}`,
      );
    },
  );

  it("uses the supplied wire type when a base64 envelope omits one", () => {
    expect(toMediaWireUrl("data:;base64,QUJD", "application/pdf")).toBe(
      "data:application/pdf;base64,QUJD",
    );
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
