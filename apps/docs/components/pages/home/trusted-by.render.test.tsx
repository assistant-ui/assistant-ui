// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ALL_SLOTS, HOLD_MIN_MS, TrustedBy } from "./trusted-by";

const widthEnvelope = (link: HTMLAnchorElement) =>
  [...link.classList]
    .filter((token) => token.startsWith("w-") || token.startsWith("max-w-"))
    .sort();

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
  it("gives the outgoing crossfade layer the incoming width envelope", () => {
    const { container } = render(<TrustedBy />);

    act(() => {
      vi.advanceTimersByTime(HOLD_MIN_MS);
    });

    const links = Array.from(container.querySelectorAll("a"));
    const outgoing = links.filter((link) =>
      link.classList.contains("absolute"),
    );
    const incoming = links.filter(
      (link) => !link.classList.contains("absolute"),
    );

    expect(outgoing).toHaveLength(1);
    expect(incoming).toHaveLength(ALL_SLOTS.length);
    expect(widthEnvelope(outgoing[0]!)).toEqual(widthEnvelope(incoming[0]!));
    expect([...outgoing[0]!.classList]).toContain("mx-auto");
  });
});
