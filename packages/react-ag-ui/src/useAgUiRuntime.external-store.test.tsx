// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import type { HttpAgent } from "@ag-ui/client";
import { afterEach, expect, it, vi } from "vitest";
import { useAgUiRuntime } from "./useAgUiRuntime";

afterEach(cleanup);

it("exposes the deprecated interrupt methods on the runtime facade", () => {
  const agent = {
    runAgent: vi.fn(),
    abortRun: vi.fn(),
  } as unknown as HttpAgent;
  const { result } = renderHook(() => useAgUiRuntime({ agent }));

  expect(Object.hasOwn(result.current, "unstable_getPendingInterrupts")).toBe(
    true,
  );
  expect(
    Object.hasOwn(result.current, "unstable_submitInterruptResponses"),
  ).toBe(true);
  expect(result.current.unstable_getPendingInterrupts()).toEqual([]);
  expect(result.current.unstable_submitInterruptResponses).toEqual(
    expect.any(Function),
  );
});

it("re-renders when the core publishes a state change", () => {
  const agent = {
    runAgent: vi.fn(),
    abortRun: vi.fn(),
  } as unknown as HttpAgent;
  let renders = 0;
  const { result } = renderHook(() => {
    renders++;
    return useAgUiRuntime({ agent });
  });
  const initialRenders = renders;

  act(() => {
    result.current.thread.append({
      role: "user",
      content: [{ type: "text", text: "hello" }],
      startRun: false,
    });
  });

  expect(renders).toBeGreaterThan(initialRenders);
  expect(result.current.thread.getState().messages).toHaveLength(1);
});
