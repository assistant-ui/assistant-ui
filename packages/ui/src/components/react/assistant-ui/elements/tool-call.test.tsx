import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { ToolCall } from "./tool-call";

// jsdom ships no ResizeObserver, which SwapLabel uses to measure its labels.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

const renderCall = (props: { running: boolean; failed?: boolean }) =>
  render(
    <ToolCall
      label="Searched the docs"
      activeLabel="Searching the docs"
      query="drafts"
      request="{}"
      result=""
      open={false}
      onOpenChange={() => {}}
      {...props}
    />,
  );

describe("ToolCall", () => {
  it("marks a settled failed call as failed", () => {
    renderCall({ running: false, failed: true });

    expect(screen.getByRole("img", { name: "Failed" })).toBeTruthy();
    expect(document.querySelector(".lucide-check")).toBeNull();
  });

  it("shows a check for a settled call that did not fail", () => {
    renderCall({ running: false });

    expect(screen.queryByRole("img", { name: "Failed" })).toBeNull();
    expect(document.querySelector(".lucide-check")).not.toBeNull();
  });

  it("shows neither mark while running, even when flagged failed", () => {
    renderCall({ running: true, failed: true });

    expect(screen.queryByRole("img", { name: "Failed" })).toBeNull();
    expect(document.querySelector(".lucide-check")).toBeNull();
  });
});
