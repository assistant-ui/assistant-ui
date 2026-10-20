// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useMediaQuery } from "./useMediaQuery";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("updates when a media query changes after mounting", () => {
  const media = Object.assign(new EventTarget(), {
    matches: false,
    media: "(prefers-reduced-motion: reduce)",
  });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
  const { result } = renderHook(() => useMediaQuery(media.media));
  expect(result.current).toBe(false);

  act(() => {
    media.matches = true;
    media.dispatchEvent(new Event("change"));
  });
  expect(result.current).toBe(true);

  act(() => {
    media.matches = false;
    media.dispatchEvent(new Event("change"));
  });
  expect(result.current).toBe(false);
});
