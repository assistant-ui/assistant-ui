// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearCart, getCart, replaceCart } from "@/lib/catalog/cart-store";
import { CartView } from "./cart-view";

const mocks = vi.hoisted(() => ({
  hydrated: true,
  items: "",
  session: null as null | {
    id: string;
    products: readonly string[];
    startedAt: number;
  },
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(mocks.items),
}));
vi.mock("@/hooks/use-hydrated", () => ({
  useHydrated: () => mocks.hydrated,
}));
vi.mock("@/components/shared/checkout-provider", () => ({
  useCheckout: () => null,
}));
vi.mock("@/lib/checkout/session-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/checkout/session-store")>()),
  useCheckoutSession: () => mocks.session,
}));

afterEach(() => {
  cleanup();
  clearCart();
  mocks.hydrated = true;
  mocks.items = "";
  mocks.session = null;
});

describe("CartView", () => {
  it("waits for hydration before rendering the cart shell", () => {
    mocks.hydrated = false;

    const { container } = render(<CartView />);

    expect(container.innerHTML).toBe("");
  });

  it("does not replace the cart from a shared link during setup", () => {
    replaceCart(["cloud"]);
    mocks.items = "items=guides/attachments";
    mocks.session = { id: "session", products: ["assistant-ui"], startedAt: 1 };

    render(<CartView />);

    expect(getCart()).toEqual(["cloud"]);
  });

  it("leaves the cart alone when a shared link has no known products", () => {
    replaceCart(["cloud"]);
    mocks.items = "items=unknown-product";

    render(<CartView />);

    expect(getCart()).toEqual(["cloud"]);
  });
});
