import { describe, expect, it } from "vitest";
import { CATALOG, resolveProducts } from "./index";
import { buildInstallPrompt, cartUrl, parseCartItems } from "./install-prompt";

describe("catalog registry", () => {
  it("has unique slugs that match their route form", () => {
    const slugs = CATALOG.map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("keeps catalog order and drops unknown slugs when resolving", () => {
    const products = resolveProducts(["cloud", "nope", "ai-sdk", "cloud"]);
    expect(products.map((p) => p.slug)).toEqual(["ai-sdk", "cloud"]);
  });
});

describe("buildInstallPrompt", () => {
  it("numbers each product and links its markdown docs", () => {
    const prompt = buildInstallPrompt(resolveProducts(["ai-sdk", "cloud"]));
    expect(prompt).toContain("## 1. assistant-ui for AI SDK");
    expect(prompt).toContain("## 2. Assistant Cloud");
    expect(prompt).toContain(
      "https://www.assistant-ui.com/docs/runtimes/ai-sdk/v7.md",
    );
    expect(prompt).toContain("llms.txt");
  });
});

describe("cart url", () => {
  it("round-trips items through the query string", () => {
    const url = cartUrl(["ai-sdk", "cloud"]);
    expect(url).toBe("/catalog/cart?items=ai-sdk,cloud");
    expect(
      parseCartItems(new URL(url, "https://x").searchParams.get("items")),
    ).toEqual(["ai-sdk", "cloud"]);
  });

  it("builds the markdown and absolute forms", () => {
    expect(cartUrl(["cloud"], { markdown: true, absolute: true })).toBe(
      "https://www.assistant-ui.com/catalog/cart.md?items=cloud",
    );
    expect(cartUrl([])).toBe("/catalog/cart");
  });

  it("dedupes and trims parsed items", () => {
    expect(parseCartItems(" cloud , cloud,,ai-sdk ")).toEqual([
      "cloud",
      "ai-sdk",
    ]);
    expect(parseCartItems(null)).toEqual([]);
  });
});

describe("estimateAgentMinutes", () => {
  it("sums the bounds of every product and formats a range", async () => {
    const { estimateAgentMinutes, formatMinutes } = await import("./index");
    const both = estimateAgentMinutes(resolveProducts(["ai-sdk", "cloud"]));
    expect(both).toEqual([10, 25]);
    expect(formatMinutes(both)).toBe("10–25 min");
    expect(formatMinutes([5, 5])).toBe("5 min");
    expect(estimateAgentMinutes([])).toEqual([0, 0]);
  });
});
