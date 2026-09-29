import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import "@/test/mock-fumadocs-collections";

vi.mock("@/lib/source", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/source")>();

  return {
    ...actual,
    blog: {
      ...actual.blog,
      getPage: () => ({
        data: {
          description: "Description",
          getText: vi.fn(async () => "Post body"),
          title: "Post",
        },
        path: "post.mdx",
        url: "/blog/post",
      }),
    },
  };
});

import { GET } from "./route";

describe("GET", () => {
  it("returns cache validators with blog markdown", async () => {
    const response = await GET(
      new Request("https://example.com/blog/post.md") as NextRequest,
      { params: Promise.resolve({ slug: "post" }) },
    );

    expect(await response.text()).toContain("# Post");
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
