import { describe, expect, it, vi } from "vitest";
import "@/test/mock-content";
import { GET } from "./route";

const { page } = vi.hoisted(() => ({
  page: {
    data: { title: "Sandbox" },
    slugs: ["sandbox"],
    url: "/safe-content-frame/docs/sandbox",
  },
}));

vi.mock("@/lib/source", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/source")>();
  const loader = actual.docsSiteSources["safe-content-frame"];
  return {
    ...actual,
    docsSiteSources: {
      ...actual.docsSiteSources,
      "safe-content-frame": {
        ...loader,
        getPage: (slug: string[] = []) =>
          slug.join("/") === "sandbox" ? page : undefined,
        getPages: () => [page],
      },
    },
  };
});

describe("GET", () => {
  it("suggests a nearby page from the requested docs site", async () => {
    const response = await GET(
      new Request("https://example.com/safe-content-frame/docs/sandboxes.md"),
      {
        params: Promise.resolve({
          site: "safe-content-frame",
          slug: ["sandboxes"],
        }),
      },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    const body = await response.text();
    expect(body).toContain(
      "There is no page at `/safe-content-frame/docs/sandboxes`.",
    );
    expect(body).toContain("[Sandbox](/safe-content-frame/docs/sandbox.md)");
  });

  it("returns a markdown 404 for an unknown docs site", async () => {
    const response = await GET(
      new Request("https://example.com/site-llms.mdx/unknown"),
      { params: Promise.resolve({ site: "unknown" }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    const body = await response.text();
    expect(body).toContain("There is no page at `/site-llms.mdx/unknown`.");
    expect(body).toContain("[llms.txt](/llms.txt)");
  });
});
