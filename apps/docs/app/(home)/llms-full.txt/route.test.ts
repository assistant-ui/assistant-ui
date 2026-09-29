import { describe, expect, it, vi } from "vitest";
import "@/test/mock-fumadocs-collections";

vi.mock("@/lib/source", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/source")>();
  const emptyCollection = { getPages: () => [] };

  return {
    ...actual,
    design: emptyCollection,
    elementsDocs: emptyCollection,
    examples: emptyCollection,
    source: emptyCollection,
  };
});

import { GET } from "./route";

describe("GET", () => {
  it("returns the complete plain-text response contract", async () => {
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, must-revalidate",
    );
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("ETag")).toMatch(/^"sha256-[a-f0-9]{64}"$/);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
  });
});
