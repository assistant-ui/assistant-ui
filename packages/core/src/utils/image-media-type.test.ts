import { afterEach, describe, expect, it, vi } from "vitest";
import { detectImageMediaType } from "./image-media-type";

const toBase64 = (bytes: number[]) =>
  Buffer.from(Uint8Array.from(bytes)).toString("base64");

describe("detectImageMediaType", () => {
  it.each([
    {
      label: "gif",
      bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
      type: "image/gif",
    },
    {
      label: "png",
      bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      type: "image/png",
    },
    { label: "jpeg", bytes: [0xff, 0xd8, 0xff, 0xe0], type: "image/jpeg" },
    { label: "bmp", bytes: [0x42, 0x4d, 0x00, 0x00], type: "image/bmp" },
    {
      label: "tiff little endian",
      bytes: [0x49, 0x49, 0x2a, 0x00],
      type: "image/tiff",
    },
    {
      label: "tiff big endian",
      bytes: [0x4d, 0x4d, 0x00, 0x2a],
      type: "image/tiff",
    },
  ])("detects $label", ({ bytes, type }) => {
    expect(detectImageMediaType(toBase64(bytes))).toBe(type);
  });

  it("detects webp across its variable size bytes", () => {
    const bytes = [
      0x52, 0x49, 0x46, 0x46, 0xde, 0xad, 0xbe, 0xef, 0x57, 0x45, 0x42, 0x50,
    ];
    expect(detectImageMediaType(toBase64(bytes))).toBe("image/webp");
  });

  it.each([
    { label: "avif", eighth: [0x61, 0x76, 0x69, 0x66], type: "image/avif" },
    { label: "heic", eighth: [0x68, 0x65, 0x69, 0x63], type: "image/heic" },
  ])("detects $label whatever its ftyp box size", ({ eighth, type }) => {
    for (const size of [0x20, 0x18, 0x1c]) {
      const bytes = [0x00, 0x00, 0x00, size, 0x66, 0x74, 0x79, 0x70, ...eighth];
      expect(detectImageMediaType(toBase64(bytes))).toBe(type);
    }
  });

  describe("without Buffer, as in a browser", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("decodes through atob", () => {
      // encoded before the stub, since the helper itself uses Buffer
      const jpeg = toBase64([0xff, 0xd8, 0xff, 0xe0]);
      const webp = toBase64([
        0x52, 0x49, 0x46, 0x46, 0xde, 0xad, 0xbe, 0xef, 0x57, 0x45, 0x42, 0x50,
      ]);
      vi.stubGlobal("Buffer", undefined);

      expect(detectImageMediaType(jpeg)).toBe("image/jpeg");
      expect(detectImageMediaType(webp)).toBe("image/webp");
    });

    it("returns undefined when atob rejects the input", () => {
      vi.stubGlobal("Buffer", undefined);

      expect(detectImageMediaType("$$$$")).toBe(undefined);
    });
  });

  it("returns undefined for bytes matching no signature", () => {
    expect(detectImageMediaType(toBase64([0x01, 0x02, 0x03, 0x04]))).toBe(
      undefined,
    );
  });

  it("does not throw on input that is not base64", () => {
    for (const value of [
      "not base64 at all!!",
      "",
      "$$$$",
      "https://x.example",
    ]) {
      expect(() => detectImageMediaType(value)).not.toThrow();
    }
  });

  it("returns undefined for a payload shorter than any signature", () => {
    expect(detectImageMediaType("/w==")).toBe(undefined);
  });
});
