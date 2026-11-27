import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import "@/test/mock-content";

const { page } = vi.hoisted(() => ({
  page: { data: { title: "Page" }, slugs: ["page"], url: "/examples/page" },
}));

vi.mock("@/lib/get-llm-text", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/get-llm-text")>()),
  getLLMText: vi.fn(async () => "# Rendered page"),
}));

vi.mock("@/lib/source", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/source")>();

  return {
    ...actual,
    examples: {
      ...actual.examples,
      getPage: (slug: string[] = []) =>
        slug.join("/") === "page" ? page : undefined,
      getPages: () => [page],
    },
  };
});

import { GET } from "./route";

describe("GET", () => {
  it("returns cache validators with rendered example markdown", async () => {
    const response = await GET(
      new Request("https://example.com/examples/page.md") as NextRequest,
      { params: Promise.resolve({ slug: ["page"] }) },
    );

    expect(await response.text()).toBe("# Rendered page");
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

  it("suggests a nearby example when the requested example is missing", async () => {
    const response = await GET(
      new Request("https://example.com/examples/pages.md") as NextRequest,
      { params: Promise.resolve({ slug: ["pages"] }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    const body = await response.text();
    expect(body).toContain("There is no page at `/examples/pages`.");
    expect(body).toContain("[Page](/examples/page.md)");
  });
});
