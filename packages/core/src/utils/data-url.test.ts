import { describe, it, expect } from "vitest";
import { httpUrlPattern, parseDataUrl } from "./data-url";

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
