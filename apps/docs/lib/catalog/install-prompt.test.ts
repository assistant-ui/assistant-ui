import { describe, expect, it } from "vitest";
import { cartUrl, parseCartItems } from "./install-prompt";

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
