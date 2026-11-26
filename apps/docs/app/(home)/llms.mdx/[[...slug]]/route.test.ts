import { describe, expect, it, vi } from "vitest";
import "@/test/mock-content";

const { getDocsMarkdown } = vi.hoisted(() => ({
  getDocsMarkdown: vi.fn(async () => "# React documentation"),
}));

vi.mock("@/lib/docs-markdown", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/docs-markdown")>()),
  getDocsMarkdown,
}));

import { GET, generateStaticParams } from "./route";

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

describe("GET for a path with no page", () => {
  const request = new Request("https://example.com/docs/runtimes/ag-ui.md");

  it("redirects a folder's markdown to its overview, as the page does", async () => {
    const { source } = await import("@/lib/source");
    const getPage = vi
      .spyOn(source, "getPage")
      .mockImplementation(((slug?: string[]) =>
        slug?.join("/") === "runtimes/ag-ui/overview"
          ? { url: "/docs/runtimes/ag-ui/overview" }
          : undefined) as never);

    await expect(
      GET(request, { params: Promise.resolve({ slug: ["runtimes", "ag-ui"] }) }),
    ).rejects.toMatchObject({
      digest: expect.stringMatching(
        /^NEXT_REDIRECT;replace;\/docs\/runtimes\/ag-ui\/overview\.md;307;/,
      ),
    });
    getPage.mockRestore();
  });
});

describe("generateStaticParams", () => {
  it("prerenders one page so the rest are cached after their first request", () => {
    expect(generateStaticParams()).toEqual([{ slug: [] }]);
  });
});
