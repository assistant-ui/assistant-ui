// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Footer } from "./footer";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("lists every platform the nav lists", () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("{}")),
  );
  render(<Footer />);

  const column = screen.getByText("Platforms").parentElement!;
  expect(
    within(column)
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]),
  ).toEqual([
    ["React", "/docs"],
    ["React Native", "/native"],
    ["Ink", "/ink"],
    ["Vue", "/docs/vue"],
  ]);
});
