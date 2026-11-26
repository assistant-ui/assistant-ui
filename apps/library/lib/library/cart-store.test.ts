import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCartStore } from "./cart-store";
import { MOVED_ITEM_IDS } from "./moved-items";

const KEY = "test-cart";

const stored = () => JSON.parse(localStorage.getItem(KEY) ?? "null");

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a cart saved before docs pages moved", () => {
  it("maps the ids of the five items that moved from Integrations to Runtimes", () => {
    expect(
      Object.fromEntries(
        [
          "integrations/frameworks-ai-sdk",
          "integrations/frameworks-mastra-overview",
          "integrations/frameworks-cloudflare-agents",
          "integrations/frameworks-openai-agents",
          "integrations/frameworks-pydantic-ai",
        ].map((id) => [id, MOVED_ITEM_IDS.get(id)]),
      ),
    ).toEqual({
      "integrations/frameworks-ai-sdk": "runtimes/ai-sdk-overview",
      "integrations/frameworks-mastra-overview": "runtimes/mastra",
      "integrations/frameworks-cloudflare-agents": "runtimes/cloudflare-agents",
      "integrations/frameworks-openai-agents": "runtimes/openai-agents",
      "integrations/frameworks-pydantic-ai": "runtimes/pydantic-ai",
    });
  });

  it("keeps an old id in the cart under its new id", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        "integrations/frameworks-mastra-overview",
        "components/thread",
      ]),
    );
    const cart = createCartStore(KEY, MOVED_ITEM_IDS);

    expect(cart.toggleCartSlug("runtimes/mastra")).toBe(false);
    expect(stored()).toEqual(["components/thread"]);
  });

  it("saves the new ids, in order, on the next change", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        "integrations/frameworks-pydantic-ai",
        "components/thread",
        "integrations/frameworks-ai-sdk",
      ]),
    );
    const cart = createCartStore(KEY, MOVED_ITEM_IDS);

    cart.removeCartSlug("components/thread");
    expect(stored()).toEqual([
      "runtimes/pydantic-ai",
      "runtimes/ai-sdk-overview",
    ]);
  });

  it("keeps one entry when the cart holds both the old and the new id", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        "runtimes/openai-agents",
        "integrations/frameworks-openai-agents",
      ]),
    );
    const cart = createCartStore(KEY, MOVED_ITEM_IDS);

    expect(cart.toggleCartSlug("components/thread")).toBe(true);
    expect(stored()).toEqual(["runtimes/openai-agents", "components/thread"]);
  });
});
