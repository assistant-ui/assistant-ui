import { describe, expect, it } from "vitest";
import { zipDownloadResponse } from "./zip-response";

describe("zip download response", () => {
  it("returns the archive with download headers", async () => {
    const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const response = zipDownloadResponse({ filename: "example.zip", bytes });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="example.zip"',
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  });

  it("returns the shared not-found response", async () => {
    const response = zipDownloadResponse();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ error: "Not found." });
  });
});
