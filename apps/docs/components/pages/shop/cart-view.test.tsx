// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addAgentTool,
  clearCart,
  getCart,
  getCartEntries,
  replaceCart,
} from "@/lib/catalog/cart-store";
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
  it("recovers an unconfigured legacy tool through its configuration dialog", async () => {
    replaceCart(["agent-tools"]);
    render(<CartView />);
    expect(screen.getByRole("button", { name: "Start setup" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Configure Agent Tool for setup" }),
    );
    fireEvent.click(
      screen.getByRole("combobox", { name: "What should the tool do?" }),
    );
    const option = await screen.findByRole("option", { name: "Web search" });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    fireEvent.click(screen.getByRole("button", { name: "Add to setup" }));
    expect(getCartEntries()).toHaveLength(1);
    expect(getCartEntries()[0]).toMatchObject({ name: "Web search" });
    expect(
      await screen.findByRole("button", { name: "Start setup" }),
    ).not.toHaveProperty("disabled", true);
  });

  it("shows and removes configured tools separately", () => {
    addAgentTool("Web search", "Search support sources.");
    addAgentTool("Web search", "Search current news.");
    render(<CartView />);
    expect(screen.getByText("Search support sources.")).toBeTruthy();
    expect(screen.getByText("Search current news.")).toBeTruthy();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Remove Web search" })[0]!,
    );
    expect(screen.queryByText("Search support sources.")).toBeNull();
    expect(getCartEntries()).toHaveLength(1);
  });

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

  it("holds Start setup while a session is stored, before its connection reports", () => {
    replaceCart(["cloud", "agent-tools"]);
    mocks.session = { id: "stale", products: ["react-app"], startedAt: 1 };

    render(<CartView />);

    expect(screen.getByRole("status").textContent).toContain(
      "Setup is in progress",
    );
    const start = screen.getByRole("button", { name: "Start setup" });
    expect(start).toHaveProperty("disabled", true);
    fireEvent.click(start);
    expect(getCart()).toEqual(["cloud", "agent-tools"]);
  });

  it("leaves the cart alone when a shared link has no known products", () => {
    replaceCart(["cloud"]);
    mocks.items = "items=unknown-product";

    render(<CartView />);

    expect(getCart()).toEqual(["cloud"]);
  });
});
