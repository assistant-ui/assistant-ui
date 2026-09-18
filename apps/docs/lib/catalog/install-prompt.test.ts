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
    const products = resolveProducts([
      "cloud",
      "nope",
      "assistant-ui",
      "cloud",
    ]);
    expect(products.map((p) => p.slug)).toEqual(["assistant-ui", "cloud"]);
  });
});

describe("buildInstallPrompt", () => {
  it("numbers each product and links its markdown docs", () => {
    const prompt = buildInstallPrompt(
      resolveProducts(["assistant-ui", "cloud"]),
    );
    expect(prompt).toContain("## 1. assistant-ui");
    expect(prompt).toContain("## 2. Assistant Cloud");
    expect(prompt).toContain(
      "https://www.assistant-ui.com/docs/runtimes/pick-a-runtime.md",
    );
    expect(prompt).toContain("llms.txt");
  });
});

describe("cart url", () => {
  it("round-trips items through the query string", () => {
    const url = cartUrl(["assistant-ui", "cloud"]);
    expect(url).toBe("/shop/cart?items=assistant-ui,cloud");
    expect(
      parseCartItems(new URL(url, "https://x").searchParams.get("items")),
    ).toEqual(["assistant-ui", "cloud"]);
  });

  it("builds the markdown and absolute forms", () => {
    expect(cartUrl(["cloud"], { markdown: true, absolute: true })).toBe(
      "https://www.assistant-ui.com/shop/cart.md?items=cloud",
    );
    expect(cartUrl([])).toBe("/shop/cart");
  });

  it("dedupes and trims parsed items", () => {
    expect(parseCartItems(" cloud , cloud,,assistant-ui ")).toEqual([
      "cloud",
      "assistant-ui",
    ]);
    expect(parseCartItems(null)).toEqual([]);
  });
});

describe("estimateAgentMinutes", () => {
  it("sums the bounds of every product and formats a range", async () => {
    const { estimateAgentMinutes, formatMinutes } = await import("./index");
    const both = estimateAgentMinutes(
      resolveProducts(["assistant-ui", "cloud"]),
    );
    expect(both).toEqual([10, 25]);
    expect(formatMinutes(both)).toBe("10–25 min");
    expect(formatMinutes([5, 5])).toBe("5 min");
    expect(estimateAgentMinutes([])).toEqual([0, 0]);
  });
});
