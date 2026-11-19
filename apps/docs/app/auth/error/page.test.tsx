// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import AuthErrorPage from "./page";

afterEach(cleanup);

async function renderPage(params: Record<string, string | string[]>) {
  render(await AuthErrorPage({ searchParams: Promise.resolve(params) }));
}

it("uses a fixed heading and shows the message for a known reason", async () => {
  await renderPage({ reason: "invalid_state" });
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Sign-in did not complete.",
  );
  expect(
    screen.getByText("The sign-in link expired. Start again."),
  ).toBeTruthy();
  expect(screen.getByText("invalid_state")).toBeTruthy();
});

it("does not show the description or an unknown reason from the url", async () => {
  await renderPage({
    reason: "Your account is locked",
    description: "Call 555-0100 to restore access",
  });
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Sign-in did not complete.",
  );
  expect(document.body.textContent).not.toContain("555-0100");
  expect(document.body.textContent).not.toContain("Your account is locked");
});

it("ignores reasons that name object prototype keys", async () => {
  await renderPage({ reason: "constructor" });
  expect(document.body.textContent).not.toContain("constructor");
});

it("ignores repeated reason params", async () => {
  await renderPage({ reason: ["access_denied", "invalid_state"] });
  expect(document.body.textContent).not.toContain("access_denied");
  expect(document.body.textContent).not.toContain("invalid_state");
  expect(document.body.textContent).not.toContain("expired");
});
