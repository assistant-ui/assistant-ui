// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const load = async () => {
  vi.resetModules();
  return import("./lazy-agent-setup");
};

afterEach(() => {
  cleanup();
  vi.resetModules();
});

describe("lazy agent setup", () => {
  it("loads the setup banner", async () => {
    const { AgentSetup } = await load();
    // The banner is a lazy chunk; importing it first keeps a slow import out of
    // findByRole's one-second window.
    await import("@/components/shared/agent-setup");
    render(<AgentSetup product="assistant-ui" />);
    expect(
      await screen.findByRole("button", {
        name: "Copy the setup prompt for your agent",
      }),
    ).toBeTruthy();
  });
});
