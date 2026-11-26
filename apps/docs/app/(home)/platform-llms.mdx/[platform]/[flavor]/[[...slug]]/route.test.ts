import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/test/mock-content";
import { PLATFORMS } from "@/lib/constants";

const { getDocsMarkdown } = vi.hoisted(() => ({
  getDocsMarkdown: vi.fn(async () => "# React Native documentation"),
}));

vi.mock("@/lib/docs-markdown", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/docs-markdown")>()),
  getDocsMarkdown,
}));

import { GET, generateStaticParams } from "./route";

const variants = PLATFORMS.flatMap((platform) =>
  (["base", "radix"] as const).map((flavor) => [platform, flavor] as const),
);

beforeEach(() => {
  getDocsMarkdown.mockClear();
});

describe("GET", () => {
  it.each(variants)(
    "returns cache validators for %s and %s",
    async (platform, flavor) => {
      const response = await GET(new Request("https://example.com/docs.md"), {
        params: Promise.resolve({
          platform,
          flavor,
        }),
      });

      expect(await response.text()).toBe("# React Native documentation");
      expect(getDocsMarkdown).toHaveBeenCalledWith(undefined, {
        flavor,
        platform,
      });
      expect(response.headers.get("Cache-Control")).toBe(
        "no-cache, must-revalidate",
      );
      expect(response.headers.get("Content-Type")).toBe(
        "text/markdown; charset=utf-8",
      );
      expect(response.headers.get("ETag")).toMatch(/^"sha256-[a-f0-9]{64}"$/);
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    },
  );

  it.each([
    ["unknown", "base"],
    ["react", "unknown"],
  ])("rejects invalid platform or flavor %s/%s", async (platform, flavor) => {
    await expect(
      GET(new Request("https://example.com/docs.md"), {
        params: Promise.resolve({ platform, flavor }),
      }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    expect(getDocsMarkdown).not.toHaveBeenCalled();
  });
});

describe("GET for a folder", () => {
  it.each([
    ["vue", "radix", "?platform=vue&view=radix-ui"],
    ["react", "radix", "?view=radix-ui"],
    ["vue", "base", "?platform=vue"],
  ] as const)(
    "redirects %s %s to the overview's markdown with the same query",
    async (platform, flavor, query) => {
      const { source } = await import("@/lib/source");
      const getPage = vi
        .spyOn(source, "getPage")
        .mockImplementation(((slug?: string[]) =>
          slug?.join("/") === "runtimes/ag-ui/overview"
            ? { url: "/docs/runtimes/ag-ui/overview" }
            : undefined) as never);

      await expect(
        GET(new Request("https://example.com/docs/runtimes/ag-ui.md"), {
          params: Promise.resolve({
            platform,
            flavor,
            slug: ["runtimes", "ag-ui"],
          }),
        }),
      ).rejects.toMatchObject({
        digest: `NEXT_REDIRECT;replace;/docs/runtimes/ag-ui/overview.md${query};307;`,
      });
      getPage.mockRestore();
    },
  );
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

  const get = (slug: string[]) =>
    withPages(() =>
      GET(new Request("https://example.com/docs.md"), {
        params: Promise.resolve({ platform: "vue", flavor: "radix", slug }),
      }),
    );

  it("answers a case-only difference in place, for the same platform", async () => {
    const response = await get(["guides", "Attachments"]);

    expect(response.status).toBe(200);
    expect(getDocsMarkdown).toHaveBeenCalledWith(["guides", "attachments"], {
      flavor: "radix",
      platform: "vue",
    });
  });

  it("redirects an API name with the platform and view kept", async () => {
    await expect(get(["primitives", "ThreadList"])).rejects.toMatchObject({
      digest: expect.stringMatching(
        /^NEXT_REDIRECT;replace;\/docs\/primitives\/thread-list\.md\?platform=vue&view=radix-ui;307;/,
      ),
    });
  });

  it("keeps the platform and view on the links of a 404", async () => {
    const response = await get(["primitives", "thread-lists"]);

    expect(response.status).toBe(404);
    expect(await response.text()).toContain(
      "(/docs/primitives/thread-list.md?platform=vue&view=radix-ui)",
    );
  });
});

describe("generateStaticParams", () => {
  it("prerenders one valid variant so the rest are cached after their first request", async () => {
    const params = generateStaticParams();
    expect(params).toEqual([{ platform: "react", flavor: "base", slug: [] }]);
    const response = await GET(new Request("https://example.com/docs.md"), {
      params: Promise.resolve(params[0]!),
    });
    expect(response.status).toBe(200);
  });
});
