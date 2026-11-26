// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSampleAnalytics } from "./use-sample-analytics";

afterEach(() => {
  delete window.posthog;
});

it("reports each kind of action once per sample on the page", () => {
  const capture = vi.fn();
  window.posthog = { capture };
  const { result } = renderHook(() =>
    useSampleAnalytics("thread-list-playground"),
  );

  act(() => {
    result.current("send");
    result.current("send");
    result.current("rename_thread");
  });

  expect(capture.mock.calls).toEqual([
    [
      "docs_sample_interacted",
      { sample: "thread-list-playground", action: "send" },
    ],
    [
      "docs_sample_interacted",
      { sample: "thread-list-playground", action: "rename_thread" },
    ],
  ]);
});

it("reports an action again once PostHog starts capturing", () => {
  const capture = vi.fn();
  let capturing = false;
  window.posthog = { capture, capturing: () => capturing };
  const { result } = renderHook(() => useSampleAnalytics("runtime-playground"));

  act(() => result.current("send"));
  capturing = true;
  act(() => {
    result.current("send");
    result.current("send");
  });

  expect(capture).toHaveBeenCalledTimes(2);
});
