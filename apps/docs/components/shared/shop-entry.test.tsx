// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const load = async () => {
  vi.resetModules();
  return import("./shop-entry");
};

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("shop entry points", () => {
  it("loads the banner when a checkout worker is configured", async () => {
    const { AgentSetup } = await load();
    // The banner is a lazy chunk; importing it first keeps a slow import out of
    // findByRole's one-second window.
    await import("@/components/shared/agent-setup");
    render(<AgentSetup product="assistant-ui" />);
    expect(
      await screen.findByRole("button", {
        name: "Copy the setup prompt for your coding agent",
      }),
    ).toBeTruthy();
  });

  it("renders nothing without a checkout worker", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    const { AgentSetup } = await load();
    const { container } = render(<AgentSetup product="assistant-ui" />);
    expect(container.innerHTML).toBe("");
  });
});
