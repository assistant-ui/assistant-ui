// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TrustedBy } from "./trusted-by";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(min-width: 640px)",
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TrustedBy", () => {
  it("keeps both crossfade layers within the centered width envelope", () => {
    const { container } = render(<TrustedBy />);

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    const links = Array.from(container.querySelectorAll("a"));
    const outgoing = links.find((link) => link.classList.contains("absolute"));
    const current = links.filter((link) =>
      link.classList.contains("inline-flex"),
    );

    expect(outgoing).toBeDefined();
    expect(outgoing?.className).toContain("mx-auto");
    expect(outgoing?.className).toContain("w-full");
    expect(outgoing?.className).toContain("max-w-[9rem]");
    expect(current).toHaveLength(9);
    expect(
      current.every((link) => link.classList.contains("max-w-[9rem]")),
    ).toBe(true);
  });
});
