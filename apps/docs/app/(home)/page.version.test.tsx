// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import reactPackage from "../../../../packages/react/package.json";

// A deployment need not carry node_modules, and reading from there is how the label went null.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: async () => {
        throw new Error("ENOENT");
      },
    },
  };
});
vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal()),
  cacheLife: vi.fn(),
}));
vi.mock("@/lib/github", () => ({ getRepo: async () => null }));
vi.mock("@/lib/npm", () => ({ getWeeklyDownloads: async () => null }));
vi.mock("@/lib/element-source", () => ({
  highlightElementSource: async (code: string) => code,
}));
vi.mock("@/components/pages/home/hero", () => ({ Hero: () => null }));
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

it("labels the workspace version with no package manifest to read at runtime", async () => {
  render(await HomePage());

  const label = screen.getByText(`@assistant-ui/react@${reactPackage.version}`);
  expect(label.parentElement?.textContent).toContain("MIT License");
});
