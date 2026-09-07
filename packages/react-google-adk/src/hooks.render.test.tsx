// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useAdkAppState } from "./hooks";
import { useAdkRuntime } from "./useAdkRuntime";

describe("ADK state hook rendering", () => {
  it("keeps the selected app state stable between store reads", () => {
    const { result: runtimeResult } = renderHook(() =>
      useAdkRuntime({
        stream: async function* () {},
      }),
    );
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AssistantRuntimeProvider runtime={runtimeResult.current}>
        {children}
      </AssistantRuntimeProvider>
    );

    const { result, rerender } = renderHook(() => useAdkAppState(), {
      wrapper,
    });
    const initial = result.current;
    rerender();

    expect(result.current).toBe(initial);
    expect(result.current).toEqual({});
  });
});
