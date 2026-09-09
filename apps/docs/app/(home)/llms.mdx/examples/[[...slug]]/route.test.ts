import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("fumadocs-mdx:collections/server", () => {
  const emptyCollection = { toFumadocsSource: () => ({ files: [] }) };
  return {
    blog: [],
    careers: [],
    design: [],
    docs: emptyCollection,
    elements: [],
    examples: [],
    tapDocs: emptyCollection,
  };
});

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
      getPage: () => ({ data: {}, slugs: ["page"], url: "/page" }),
    },
  };
});

import { GET } from "./route";

describe("GET", () => {
  it("returns cache validators with rendered example markdown", async () => {
    const response = await GET(
      new Request("https://example.com/page.md") as NextRequest,
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
});
