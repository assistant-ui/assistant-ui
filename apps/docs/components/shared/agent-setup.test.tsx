// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentSetup } from "./agent-setup";

const mocks = vi.hoisted(() => ({ beginSetup: vi.fn() }));
vi.mock("./setup-navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./setup-navigation")>()),
  useBeginSetup: () => mocks.beginSetup,
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("agent setup banner", () => {
  it("offers the cart and a direct setup for a cart product", () => {
    render(<AgentSetup product="elements/thread-list" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Add Thread list to cart" }),
    );
    expect(
      screen.getByRole("button", { name: "Remove Thread list from cart" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Begin setup" }));
    expect(mocks.beginSetup).toHaveBeenCalledWith(["elements/thread-list"]);
  });

  it("offers only the direct setup for a setup-only product", () => {
    render(<AgentSetup product="assistant-ui" />);
    expect(screen.queryByRole("button", { name: /cart/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Begin setup" })).toBeTruthy();
  });

  it("renders nothing for an unknown product", () => {
    const { container } = render(<AgentSetup product="nope" />);
    expect(container.innerHTML).toBe("");
  });
});
