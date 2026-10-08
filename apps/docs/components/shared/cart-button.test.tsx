// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addAgentTool,
  clearCart,
  replaceCart,
  toggleCartItem,
} from "../../lib/catalog/cart-store";
import { endCheckout, startCheckout } from "../../lib/checkout/session-store";
import { CartButton } from "./cart-button";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/elements/thread-list",
  useRouter: () => ({ push: vi.fn() }),
}));

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    new DOMRect(),
  ] as unknown as DOMRectList);
});

afterEach(() => {
  cleanup();
  endCheckout();
  clearCart();
  localStorage.clear();
  vi.restoreAllMocks();
});

const add = async () => {
  render(<CartButton />);
  act(() => toggleCartItem("cloud"));
  return screen.findByText(/^Added to/);
};

describe("cart button", () => {
  it("sends legacy tool selections to configuration before setup", async () => {
    replaceCart(["agent-tools"]);
    await add();
    expect(
      screen
        .getByRole("button", { name: "Configure tools" })
        .getAttribute("href"),
    ).toBe("/components/cart");
    expect(screen.queryByRole("button", { name: "Start setup" })).toBeNull();
  });

  it("confirms the configured tool name", async () => {
    render(<CartButton />);
    act(() => addAgentTool("Support search", "Search support sources."));
    expect(await screen.findByText("Support search")).toBeTruthy();
  });

  it("confirms a product added to the setup", async () => {
    expect((await add()).textContent).toBe("Added to setup");
  });

  it("says a product waits for the next setup before the running one has connected", async () => {
    startCheckout(["assistant-ui"]);
    expect((await add()).textContent).toBe("Added to next setup");
    expect(screen.getByText("In next setup")).toBeTruthy();
  });
});
