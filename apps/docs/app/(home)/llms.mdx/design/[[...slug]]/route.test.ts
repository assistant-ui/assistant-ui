import { describe, expect, it, vi } from "vitest";
import "@/test/mock-content";

const { button, getLLMText } = vi.hoisted(() => ({
  button: {
    data: { title: "Button" },
    slugs: ["button"],
    url: "/design/button",
  },
  getLLMText: vi.fn(async () => "# Button"),
}));

vi.mock("@/lib/get-llm-text", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/get-llm-text")>()),
  getLLMText,
}));

vi.mock("@/lib/source", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/source")>();
  return {
    ...actual,
    design: {
      ...actual.design,
      getPage: (slug: string[] = []) =>
        slug.join("/") === "button" ? button : undefined,
      getPages: () => [button],
    },
  };
});

import { GET } from "./route";

describe("GET", () => {
  it("returns cache validators with Base UI design markdown", async () => {
    const response = await GET(new Request("https://example.com/design/button.md"), {
      params: Promise.resolve({ slug: ["button"] }),
    });

    expect(await response.text()).toBe("# Button");
    expect(getLLMText).toHaveBeenCalledWith(button, { flavor: "base" });
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

  it("suggests a nearby design page when the requested page is missing", async () => {
    const response = await GET(
      new Request("https://example.com/design/buttons.md"),
      { params: Promise.resolve({ slug: ["buttons"] }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    const body = await response.text();
    expect(body).toContain("There is no page at `/design/buttons`.");
    expect(body).toContain("[Button](/design/button.md)");
  });
});
