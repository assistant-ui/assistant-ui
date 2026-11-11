// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  screen.getByRole("button", { name: "Talk to an expert" }).parentElement!;

const expectTalkToAnExpert = (count: number) => {
  const row = ctaRow();
  expect(row.children).toHaveLength(count);
  const expert = screen.getByRole("button", { name: "Talk to an expert" });
  expect(expert.parentElement).toBe(row);
  expect(expert.getAttribute("href")).toBe("/contact-sales");
};

describe("hero", () => {
  it("offers the one-line setup prompt and a small manual link when checkout is configured", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const { Hero } = await load();
    render(<Hero stars={null} downloads={null} />);
    const prompt = screen.getByRole("button", {
      name: "Copy the setup prompt for your coding agent",
    });
    expect(prompt.textContent).toBe(
      "Set up assistant-ui with npx assistant-ui@latest setup",
    );
    fireEvent.click(prompt);
    expect(writeText).toHaveBeenCalledWith(
      "Set up assistant-ui with `npx assistant-ui@latest setup`",
    );
    expect(
      screen.getByRole("link", { name: "Manual" }).getAttribute("href"),
    ).toBe("/docs/installation");
    expect(screen.queryByRole("button", { name: "Quick Start" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(prompt.parentElement).toBe(ctaRow());
    expectTalkToAnExpert(3);
  });

  it("links the primary call to action to the installation guide without a checkout worker", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const { Hero } = await load();
    render(<Hero stars={null} downloads={null} />);
    const link = screen.getByRole("button", { name: "Quick Start" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/docs/installation");
    expectTalkToAnExpert(2);
  });
});
