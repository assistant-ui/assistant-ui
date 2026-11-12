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
  it("offers the one-line setup prompt with a menu and a ghost expert link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const { Hero } = await load();
    render(<Hero stars={null} downloads={null} />);
    const prompt = screen.getByRole("button", {
      name: "Copy the setup prompt for your agent",
    });
    expect(prompt.textContent).toBe("install and set up assistant-ui");
    expect(prompt.textContent).not.toContain("Tell your coding agent");
    fireEvent.click(prompt);
    expect(writeText).toHaveBeenCalledWith("install and set up assistant-ui");
    expect(screen.queryByRole("link", { name: "Install manually" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Quick Start" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    const split = prompt.parentElement!;
    expect(split.parentElement).toBe(ctaRow());
    expect(
      split.contains(
        screen.getByRole("button", { name: "More ways to install" }),
      ),
    ).toBe(true);
    expectTalkToAnExpert(2);
    const expert = screen.getByRole("button", { name: "Talk to an expert" });
    expect(expert.className).toContain("hover:bg-transparent");
    expect(expert.querySelector("svg[aria-hidden]")).not.toBeNull();
  });
});
