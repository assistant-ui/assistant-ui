// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ beginSetup: vi.fn() }));
vi.mock("./setup-navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./setup-navigation")>()),
  useBeginSetup: () => mocks.beginSetup,
}));

const load = async () => {
  vi.resetModules();
  return import("./shop-entry");
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("shop entry points", () => {
  it("loads the banner when a checkout worker is configured", async () => {
    const { AgentSetup } = await load();
    render(<AgentSetup product="assistant-ui" />);
    expect(
      await screen.findByRole("button", { name: "Begin setup" }),
    ).toBeTruthy();
  });

  it("keeps the banner for the main installer only when the shop is closed", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHOP_ENABLED", "");
    vi.stubEnv("NODE_ENV", "production");
    const { AgentSetup, CartButton } = await load();
    const { container } = render(
      <>
        <CartButton />
        <AgentSetup product="guides/mcp" />
        <AgentSetup product="elements/thread-list" />
        <AgentSetup product="cloud" />
      </>,
    );
    await Promise.resolve();
    expect(container.innerHTML).toBe("");
    render(<AgentSetup product="assistant-ui" />);
    expect(
      await screen.findByRole("button", { name: "Begin setup" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /cart/i })).toBeNull();
  });

  it("renders nothing without a checkout worker", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    const { AgentSetup, CartButton } = await load();
    const { container } = render(
      <>
        <CartButton />
        <AgentSetup product="assistant-ui" />
      </>,
    );
    expect(container.innerHTML).toBe("");
  });
});
