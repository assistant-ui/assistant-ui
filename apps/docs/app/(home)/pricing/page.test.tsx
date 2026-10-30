// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal()),
  analytics: { cta: { clicked: vi.fn() } },
}));

import PricingPage from "./page";

afterEach(cleanup);

const NEW_TAB = " (opens in a new tab)";

const anyAction = () =>
  [
    ...screen.getAllByRole("link"),
    ...screen.getAllByRole("button"),
  ] as HTMLElement[];

it("labels each primary action by where it goes", () => {
  render(<PricingPage />);

  expect(screen.queryByText("Get started")).toBeNull();
  expect(
    screen.getByText("Start Pro").closest("a")?.getAttribute("href"),
  ).toContain("/org?plan=pro");
  expect(
    screen
      .getAllByText("Read the docs")
      .map((label) => label.closest("a")?.getAttribute("href")),
  ).toEqual(["/docs", "/docs"]);
});

it("announces every action that opens a new tab", () => {
  render(<PricingPage />);

  const newTabActions = anyAction().filter(
    (action) => action.getAttribute("target") === "_blank",
  );
  expect(newTabActions.map((action) => action.textContent).sort()).toEqual([
    `Contact sales${NEW_TAB}`,
    `GitHub${NEW_TAB}`,
    `Open Cloud${NEW_TAB}`,
    `Start Pro${NEW_TAB}`,
    `Start free${NEW_TAB}`,
  ]);
});
