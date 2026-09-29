// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

const load = async () => {
  vi.resetModules();
  return import("./hero");
};

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

const ctaRow = () =>
  screen.getByRole("button", { name: "Quick Start" }).parentElement!;

describe("hero", () => {
  it("opens the setup dialog from the one call to action when checkout is configured", async () => {
    const { Hero } = await load();
    render(<Hero stars={null} downloads={null} />);
    const trigger = screen.getByRole("button", { name: "Quick Start" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(ctaRow().children).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Read the docs" })).toBeNull();
    expect(screen.queryByText("npx assistant-ui init")).toBeNull();
  });

  it("links the call to action to the installation guide without a checkout worker", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const { Hero } = await load();
    render(<Hero stars={null} downloads={null} />);
    const link = screen.getByRole("button", { name: "Quick Start" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/docs/installation");
    expect(ctaRow().children).toHaveLength(1);
  });
});
