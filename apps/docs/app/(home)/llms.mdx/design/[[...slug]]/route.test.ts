import { describe, expect, it, vi } from "vitest";
import "@/test/mock-fumadocs-collections";

const { getDesignMarkdown } = vi.hoisted(() => ({
  getDesignMarkdown: vi.fn(async () => "# Base design"),
}));

vi.mock("@/lib/design-markdown", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/design-markdown")>()),
  getDesignMarkdown,
}));

import { GET } from "./route";

describe("GET", () => {
  it("returns cache validators with Base UI design markdown", async () => {
    const response = await GET(new Request("https://example.com/design.md"), {
      params: Promise.resolve({}),
    });

    expect(await response.text()).toBe("# Base design");
    expect(getDesignMarkdown).toHaveBeenCalledWith(undefined, "base");
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
