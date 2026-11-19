import { describe, expect, it } from "vitest";
import { frameCsp, prepareDocument } from "./document";

describe("network policy for remote frames", () => {
  it("leaves a public URL remote to its server's policy", () => {
    expect(frameCsp(undefined)).toBeUndefined();
    expect(frameCsp("public")).toBeUndefined();
  });

  it('holds a URL remote\'s images and media to itself under "none"', () => {
    expect(frameCsp("none")).toBe(
      "connect-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:",
    );
  });

  it("adds a host list to images and media", () => {
    expect(frameCsp(["https://cdn.example"])).toBe(
      "connect-src https://cdn.example; img-src 'self' data: blob: https://cdn.example; media-src 'self' data: blob: https://cdn.example",
    );
  });

  it('writes the image and media limits into a document the host shows under "none"', async () => {
    const html = await prepareDocument('<img src="https://x.example/a.png">', {
      network: "none",
    });
    expect(html).toContain(
      `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:">`,
    );
  });
});
