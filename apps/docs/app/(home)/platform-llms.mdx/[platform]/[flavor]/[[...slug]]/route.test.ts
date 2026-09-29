import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/test/mock-fumadocs-collections";
import { PLATFORMS } from "@/lib/constants";

const { getDocsMarkdown } = vi.hoisted(() => ({
  getDocsMarkdown: vi.fn(async () => "# React Native documentation"),
}));

vi.mock("@/lib/docs-markdown", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/docs-markdown")>()),
  getDocsMarkdown,
}));

import { GET } from "./route";

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
