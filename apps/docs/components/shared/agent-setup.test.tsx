// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearCart } from "../../lib/catalog/cart-store";
import {
  endCheckout,
  getCheckoutSession,
  startCheckout,
} from "../../lib/checkout/session-store";
import { AgentSetup } from "./agent-setup";

const mocks = vi.hoisted(() => ({ beginSetup: vi.fn() }));
vi.mock("./setup-navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./setup-navigation")>()),
  useBeginSetup: () => mocks.beginSetup,
}));

afterEach(() => {
  cleanup();
  endCheckout();
  clearCart();
  localStorage.clear();
});

describe("agent setup banner", () => {
  it("offers the cart and a direct setup for a cart product", () => {
    render(<AgentSetup product="elements/thread-list" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Add Thread list to setup" }),
    );
    expect(
      screen.getByRole("button", { name: "Remove Thread list from setup" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Begin setup" }));
    expect(mocks.beginSetup).toHaveBeenCalledWith(["elements/thread-list"]);
  });

  it("offers only the direct setup for a setup-only product", () => {
    render(<AgentSetup product="assistant-ui" />);
    expect(screen.queryByRole("button", { name: /cart/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Begin setup" })).toBeTruthy();
  });

  it("leads with adding to the setup where the agent is the main way to install", () => {
    render(<AgentSetup product="elements/thread-list" prominent />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Add to setup",
      "Begin setup",
    ]);
  });

  it("queues a product for the next setup while a setup without it runs", () => {
    const session = startCheckout(["assistant-ui"]);
    render(<AgentSetup product="elements/thread-list" prominent />);
    fireEvent.click(
      screen.getByRole("button", { name: "Add Thread list to next setup" }),
    );
    expect(
      screen.getByRole("button", {
        name: "Remove Thread list from next setup",
      }).textContent,
    ).toBe("In next setup");
    expect(getCheckoutSession()).toEqual(session);
    expect(screen.queryByRole("button", { name: "Continue setup" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Begin setup" })).toBeNull();
  });

  it("returns to the running setup from a product it holds", () => {
    startCheckout(["elements/thread-list"]);
    render(<AgentSetup product="elements/thread-list" prominent />);
    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["Continue setup"]);
  });

  it("returns to the running setup from a product that starts one", () => {
    startCheckout(["assistant-ui"]);
    render(<AgentSetup product="assistant-ui" />);
    expect(screen.getByRole("button", { name: "Continue setup" })).toBeTruthy();
  });

  it("renders nothing for an unknown product", () => {
    const { container } = render(<AgentSetup product="nope" />);
    expect(container.innerHTML).toBe("");
  });
});
