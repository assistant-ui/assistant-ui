// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal()),
  cacheLife: vi.fn(),
}));
vi.mock("@/lib/github", () => ({ getRepo: async () => null }));
vi.mock("@/lib/npm", () => ({ getWeeklyDownloads: async () => null }));
vi.mock("@/lib/element-source", () => ({
  highlightElementSource: async (code: string) => code,
}));
vi.mock("@/components/pages/home/hero", async (importOriginal) => ({
  ...(await importOriginal()),
  Hero: () => null,
}));
vi.mock("@/components/pages/home/demo", () => ({ HomeDemo: () => null }));

import HomePage from "./page";

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

it("closes with the same call to action as the hero", async () => {
  render(await HomePage());

  expect(
    screen.getByRole("button", {
      name: "Copy the setup prompt for your agent",
    }).textContent,
  ).toBe("install and set up assistant-ui");
  expect(
    screen
      .getByRole("button", { name: "Talk to an expert" })
      .getAttribute("href"),
  ).toBe("/contact-sales");
  expect(screen.queryByText("Read the docs")).toBeNull();
});
