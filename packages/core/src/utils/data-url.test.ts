import { describe, it, expect } from "vitest";
import {
  httpUrlPattern,
  parseDataUrl,
  resolveFilePartSource,
} from "./data-url";

describe("parseDataUrl", () => {
  it("parses a base64 data URL", () => {
    expect(parseDataUrl("data:image/png;base64,aGVsbG8=")).toEqual({
      mimeType: "image/png",
      data: "aGVsbG8=",
    });
  });

  it("parses a data URL with extra parameters", () => {
    expect(parseDataUrl("data:text/plain;charset=utf-8;base64,aGk=")).toEqual({
      mimeType: "text/plain",
      data: "aGk=",
    });
  });

  it("returns null for non-base64 data URLs", () => {
    expect(parseDataUrl("data:text/plain,hello")).toBeNull();
  });

  it("parses a data URL with an empty payload as zero-byte data", () => {
    expect(parseDataUrl("data:image/png;base64,")).toEqual({
      mimeType: "image/png",
      data: "",
    });
  });

  it("parses an uppercase scheme", () => {
    expect(parseDataUrl("DATA:image/png;base64,aGVsbG8=")).toEqual({
      mimeType: "image/png",
      data: "aGVsbG8=",
    });
  });

  it("parses a mixed-case scheme and base64 token", () => {
    expect(parseDataUrl("Data:image/png;Base64,aGVsbG8=")).toEqual({
      mimeType: "image/png",
      data: "aGVsbG8=",
    });
  });

  it("lowercases the captured mime type", () => {
    expect(parseDataUrl("data:IMAGE/PNG;base64,aGVsbG8=")).toEqual({
      mimeType: "image/png",
      data: "aGVsbG8=",
    });
  });

  it("returns null for plain strings", () => {
    expect(parseDataUrl("aGVsbG8=")).toBeNull();
  });

  it("returns null for http URLs", () => {
    expect(parseDataUrl("https://example.com/a.png")).toBeNull();
  });
});

describe("httpUrlPattern", () => {
  it.each(["http://example.com", "https://example.com", "HTTPS://EXAMPLE.COM"])(
    "matches %s",
    (value) => {
      expect(httpUrlPattern.test(value)).toBe(true);
    },
  );

  it.each(["ftp://example.com", "data:image/png;base64,aGk=", "/relative"])(
    "does not match %s",
    (value) => {
      expect(httpUrlPattern.test(value)).toBe(false);
    },
  );
});

describe("resolveFilePartSource", () => {
  it("uses an explicit url source type for opaque values", () => {
    expect(
      resolveFilePartSource({
        data: "provider-file-id",
        mimeType: "application/pdf",
        sourceType: "url",
      }),
    ).toEqual({ kind: "url", url: "provider-file-id" });
  });

  it("uses http URLs as url sources", () => {
    expect(
      resolveFilePartSource({
        data: "https://example.com/file.pdf",
        mimeType: "application/pdf",
      }),
    ).toEqual({ kind: "url", url: "https://example.com/file.pdf" });
  });

  it("decodes data URLs and uses their media type", () => {
    expect(
      resolveFilePartSource({
        data: "data:image/png;base64,aGVsbG8=",
        mimeType: "application/octet-stream",
      }),
    ).toEqual({
      kind: "data",
      data: "aGVsbG8=",
      mimeType: "image/png",
    });
  });

  it("passes through opaque data with its declared media type", () => {
    expect(
      resolveFilePartSource({
        data: "provider-file-id",
        mimeType: "application/pdf",
      }),
    ).toEqual({
      kind: "data",
      data: "provider-file-id",
      mimeType: "application/pdf",
    });
  });
});
