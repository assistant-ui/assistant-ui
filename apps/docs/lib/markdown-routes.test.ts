import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { page } = vi.hoisted(() => ({
  page: {
    data: { title: "Page" },
    slugs: ["page"],
    url: "/page",
  },
}));

vi.mock("@/lib/get-llm-text", () => ({
  getLLMText: vi.fn(async () => "# Rendered page"),
}));

vi.mock("@/lib/source", () => {
  const collection = {
    getPage: () => page,
    getPages: () => [page],
  };

  return {
    design: collection,
    elementsDocs: collection,
    examples: collection,
    getTapDocsPage: () => page,
    getTapDocsPages: () => [page],
    source: collection,
    tapDocs: collection,
  };
});

import { GET as getElementsMarkdown } from "../app/(home)/llms.mdx/elements/[[...slug]]/route";
import { GET as getExamplesMarkdown } from "../app/(home)/llms.mdx/examples/[[...slug]]/route";
import { GET as getTapMarkdown } from "../app/(home)/tap-llms.mdx/[[...slug]]/route";
import { GET as getFullMarkdown } from "../app/(home)/llms-full.txt/route";

const request = new Request("https://www.assistant-ui.com/page.md");
const context = { params: Promise.resolve({ slug: ["page"] }) };

describe("plain markdown routes", () => {
  it("returns validators from each page route", async () => {
    const responses = await Promise.all([
      getElementsMarkdown(request, context),
      getExamplesMarkdown(request as NextRequest, context),
      getTapMarkdown(request as NextRequest, context),
    ]);

    for (const response of responses) {
      expect(response.headers.get("Cache-Control")).toBe(
        "no-cache, must-revalidate",
      );
      expect(response.headers.get("Content-Type")).toBe(
        "text/markdown; charset=utf-8",
      );
      expect(response.headers.get("ETag")).toMatch(/^"sha256-[\w-]+"$/);
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    }
  });

  it("returns the same policy with a plain-text type for llms-full", async () => {
    const response = await getFullMarkdown();

    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, must-revalidate",
    );
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("ETag")).toMatch(/^"sha256-[\w-]+"$/);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
  });
});
