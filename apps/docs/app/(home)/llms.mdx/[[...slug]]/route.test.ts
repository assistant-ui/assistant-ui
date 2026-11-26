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

describe("GET for a name in another case", () => {
  const pages = [
    {
      url: "/docs/guides/attachments",
      slugs: ["guides", "attachments"],
      data: { title: "Attachments" },
    },
    {
      url: "/docs/primitives/thread-list",
      slugs: ["primitives", "thread-list"],
      data: { title: "ThreadList" },
    },
  ];

  async function withPages<T>(run: () => Promise<T>) {
    const { source } = await import("@/lib/source");
    const getPages = vi
      .spyOn(source, "getPages")
      .mockReturnValue(pages as never);
    try {
      return await run();
    } finally {
      getPages.mockRestore();
    }
  }

  it("answers a case-only difference in place, never redirecting to itself", async () => {
    getDocsMarkdown.mockClear();
    const response = await withPages(() =>
      GET(new Request("https://example.com/docs/guides/Attachments.md"), {
        params: Promise.resolve({ slug: ["guides", "Attachments"] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(getDocsMarkdown).toHaveBeenCalledWith(["guides", "attachments"], {
      flavor: "base",
      platform: "react",
    });
  });

  it("redirects an API name to its kebab-case page", async () => {
    await expect(
      withPages(() =>
        GET(new Request("https://example.com/docs/primitives/ThreadList.md"), {
          params: Promise.resolve({ slug: ["primitives", "ThreadList"] }),
        }),
      ),
    ).rejects.toMatchObject({
      digest: expect.stringMatching(
        /^NEXT_REDIRECT;replace;\/docs\/primitives\/thread-list\.md;307;/,
      ),
    });
  });

  it("answers a missing page with a markdown 404 that names the nearest", async () => {
    const response = await withPages(() =>
      GET(new Request("https://example.com/docs/primitives/thread-lists.md"), {
        params: Promise.resolve({ slug: ["primitives", "thread-lists"] }),
      }),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, must-revalidate",
    );
    expect(response.headers.get("ETag")).toMatch(/^"sha256-[a-f0-9]{64}"$/);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    expect(await response.text()).toContain(
      "[ThreadList](/docs/primitives/thread-list.md)",
    );
  });
});

describe("generateStaticParams", () => {
  it("prerenders one page so the rest are cached after their first request", () => {
    expect(generateStaticParams()).toEqual([{ slug: [] }]);
  });
});
