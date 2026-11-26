import { describe, expect, it } from "vitest";
import "@/test/mock-content";
import sitemap from "./sitemap";
import { GET as elementsMarkdown } from "./(home)/llms.mdx/elements/[[...slug]]/route";
import { GET as designMarkdown } from "./(home)/llms.mdx/design/[[...slug]]/route";

// Agents fetch a page's `.md`; the sitemap is the list of pages they find.
// The /elements and /design entries come from code registries, so this walks
// them through the markdown routes. The /docs, /examples and /blog entries
// come from the same content collections their markdown routes read.
const pathsUnder = (prefix: string) =>
  sitemap()
    .map((entry) => new URL(entry.url).pathname)
    .filter((path) => path === prefix || path.startsWith(`${prefix}/`));

const slugOf = (path: string, prefix: string) =>
  path.slice(prefix.length).split("/").filter(Boolean);

describe("every sitemap page under /elements has markdown", () => {
  const paths = pathsUnder("/elements");

  it("covers the gallery", () => {
    expect(paths.length).toBeGreaterThan(100);
    expect(paths).toContain("/elements/generative-cart");
    expect(paths).toContain("/elements/vocabulary");
  });

  it.each(paths)("%s.md", async (path) => {
    const response = await elementsMarkdown(
      new Request(`https://x${path}.md`),
      {
        params: Promise.resolve({ slug: slugOf(path, "/elements") }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(await response.text()).toMatch(/^# \S/);
  });
});

describe("markdown for pages built from the registry", () => {
  const read = async (slug: string[]) =>
    elementsMarkdown(new Request("https://x"), {
      params: Promise.resolve({ slug }),
    });

  it("gives a generative gallery page its install, usage and spec", async () => {
    const text = await (await read(["generative-cart"])).text();

    expect(text).toContain("npm install @assistant-ui/generative-ui zod");
    expect(text).toContain("renderGenerativeUI(spec, library");
    expect(text).toContain("## Spec");
    expect(text).toContain('"$type": "Card"');
  });

  it("gives the vocabulary every component with its props", async () => {
    const text = await (await read(["vocabulary"])).text();

    expect(text).toContain("### Card");
    expect(text).toContain("### Alert");
    expect(text).toContain('"_type"');
  });

  it("lists the gallery pages in the elements index", async () => {
    const response = await elementsMarkdown(new Request("https://x"), {
      params: Promise.resolve({}),
    });

    expect(await response.text()).toContain("(/elements/generative-cart)");
  });

  it("answers a missing elements page with the nearest ones", async () => {
    const response = await read(["generative-carts"]);

    expect(response.status).toBe(404);
    expect(await response.text()).toContain("(/elements/generative-cart.md)");
  });
});

describe("/design/components", () => {
  it("serves the components index as markdown", async () => {
    expect(pathsUnder("/design")).toContain("/design/components");
    const response = await designMarkdown(new Request("https://x"), {
      params: Promise.resolve({ slug: ["components"] }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toMatch(/^# Design/);
  });
});
