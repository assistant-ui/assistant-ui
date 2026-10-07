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
