// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Header } from "./header";

vi.mock(
  "@/components/pages/docs/assistant/context",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    useAssistantPanel: () => ({ toggle: vi.fn() }),
  }),
);
vi.mock("@/components/shared/header-brand-link", () => ({
  HeaderBrandLink: () => null,
}));
vi.mock("./search-dialog", () => ({ SearchDialog: () => null }));
vi.mock("@/components/shared/shop-entry", () => ({ CartButton: () => null }));

afterEach(cleanup);

describe("Header mobile menu", () => {
  it("keeps the closed menu out of the tab order until the toggle opens it", () => {
    render(<Header />);
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    const panel = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    )!;

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hasAttribute("inert")).toBe(true);

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hasAttribute("inert")).toBe(false);
  });

  it("returns focus to the toggle when a link opens in a new tab", () => {
    render(<Header />);
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    const panel = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    )!;
    fireEvent.click(toggle);

    fireEvent.click(within(panel).getByRole("link", { name: "Cloud" }));

    expect(panel.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  it("names the icon links", () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "GitHub" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Discord" })).toBeTruthy();
  });

  it("includes the visible text in the name of the search and Ask AI buttons", () => {
    render(<Header />);

    const search = screen
      .getAllByRole("button", { name: /^Search/ })
      .find((button) => button.textContent?.includes("Search"))!;
    expect(search.getAttribute("aria-label")).toBeNull();
    expect(search.getAttribute("aria-keyshortcuts")).toContain("Meta+K");

    const askAi = screen.getByRole("button", { name: /^Ask AI/ });
    expect(askAi.getAttribute("aria-label")).toBeNull();
    expect(askAi.getAttribute("aria-keyshortcuts")).toContain("Meta+I");
  });

  it("labels the navigation landmark", () => {
    render(<Header />);

    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
  });
});
