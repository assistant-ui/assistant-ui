// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LibraryShowcase } from "./library-showcase";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const setupTabs = [
  { id: "ai-sdk", label: "AI SDK", caption: "", docs: "/docs/a", html: "" },
  { id: "custom", label: "Custom", caption: "", docs: "/docs/b", html: "" },
];

describe("LibraryShowcase", () => {
  it("keeps only tabs inside the tablist", () => {
    render(<LibraryShowcase setupTabs={setupTabs} />);
    const tablist = screen.getByRole("tablist");

    expect(
      [...tablist.children].map((child) => child.getAttribute("role")),
    ).toEqual(["tab", "tab"]);
    expect(
      within(tablist).queryByRole("link", { name: /All runtimes/ }),
    ).toBeNull();
    expect(screen.getByRole("link", { name: /All runtimes/ })).toBeTruthy();
  });

  it.each([
    "A provider, a hook, one component.",
    "What the runtime handles",
    "Yours to reshape.",
  ])("exposes %s as a level 3 heading", (name) => {
    render(<LibraryShowcase setupTabs={setupTabs} />);

    expect(screen.getByRole("heading", { level: 3, name })).toBeTruthy();
  });
});
