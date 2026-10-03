// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getShippingMethod } from "../../lib/catalog/shipping-store";
import { SetupWithButton } from "./setup-with-button";

const mocks = vi.hoisted(() => ({ beginSetup: vi.fn() }));
vi.mock("./setup-navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./setup-navigation")>()),
  useBeginSetup: () => mocks.beginSetup,
}));

const reducedMotion = (matches: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches })),
  );

const button = () =>
  screen.getByRole("button", { name: "Set up with your coding agent" });

const shown = () =>
  ["Claude Code", "Codex", "Cursor"].filter((name) =>
    screen.getByText(name).className.includes("opacity-100"),
  );

beforeEach(() => {
  vi.useFakeTimers();
  reducedMotion(false);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("set up with button", () => {
  it("cycles Claude Code, Codex, Cursor and back", () => {
    render(<SetupWithButton location="hero" />);
    const seen = [shown()];
    for (let step = 0; step < 3; step++) {
      act(() => vi.advanceTimersByTime(2200));
      seen.push(shown());
    }
    expect(seen).toEqual([
      ["Claude Code"],
      ["Codex"],
      ["Cursor"],
      ["Claude Code"],
    ]);
  });

  it("starts an assistant-ui setup with the agent it is naming", () => {
    render(<SetupWithButton location="hero" />);
    act(() => vi.advanceTimersByTime(2200));
    fireEvent.click(button());
    expect(mocks.beginSetup).toHaveBeenCalledWith(["assistant-ui"]);
    expect(getShippingMethod().id).toBe("codex");
  });

  it("holds the current agent while hovered or focused", () => {
    render(<SetupWithButton location="hero" />);
    fireEvent.pointerEnter(button());
    act(() => vi.advanceTimersByTime(10000));
    expect(shown()).toEqual(["Claude Code"]);
    fireEvent.pointerLeave(button());
    act(() => vi.advanceTimersByTime(2200));
    expect(shown()).toEqual(["Codex"]);
  });

  it("stays on Claude Code when the visitor prefers reduced motion", () => {
    reducedMotion(true);
    render(<SetupWithButton location="hero" />);
    act(() => vi.advanceTimersByTime(10000));
    expect(shown()).toEqual(["Claude Code"]);
  });
});
