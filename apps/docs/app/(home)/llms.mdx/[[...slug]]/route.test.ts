import { describe, expect, it, vi } from "vitest";
import "@/test/mock-fumadocs-collections";

const { getDocsMarkdown } = vi.hoisted(() => ({
  getDocsMarkdown: vi.fn(async () => "# React documentation"),
}));

vi.mock("@/lib/docs-markdown", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/docs-markdown")>()),
  getDocsMarkdown,
}));

import { GET } from "./route";

describe("GET", () => {
  it("returns cache validators with default React markdown", async () => {
    const response = await GET(new Request("https://example.com/docs.md"), {
      params: Promise.resolve({}),
    });

    expect(await response.text()).toBe("# React documentation");
    expect(getDocsMarkdown).toHaveBeenCalledWith(undefined, {
      flavor: "base",
      platform: "react",
    });
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, must-revalidate",
    );
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("ETag")).toMatch(
      /^"sha256-[a-f0-9]{64}"$/,
    );
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
  });
});
