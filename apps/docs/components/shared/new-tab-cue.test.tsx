// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { NewTabCue } from "./new-tab-cue";

afterEach(cleanup);

it("names the new tab in the link's accessible name", () => {
  render(
    <a href="https://example.com" target="_blank" rel="noopener noreferrer">
      Open Cloud
      <NewTabCue />
    </a>,
  );

  expect(
    screen.getByRole("link", { name: "Open Cloud (opens in a new tab)" }),
  ).toBeTruthy();
});
