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
