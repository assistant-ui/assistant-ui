// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { makeAdapter } from "../../tests/remote-thread-list-test-helpers";

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({ threadListItem: { source: {} } }),
}));

import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

describe("useRemoteThreadListRuntime nested runtime", () => {
  it("evaluates the render-local runtime hook on rerender", () => {
    const runtimeA = { marker: "A" } as unknown as AssistantRuntime;
    const runtimeB = { marker: "B" } as unknown as AssistantRuntime;
    const adapter = makeAdapter();
    const hookA = () => runtimeA;
    const hookB = () => runtimeB;

    const { result, rerender } = renderHook(
      ({ runtimeHook }) =>
        useRemoteThreadListRuntime({
          adapter,
          allowNesting: true,
          runtimeHook,
        }),
      { initialProps: { runtimeHook: hookA } },
    );
    expect(result.current).toBe(runtimeA);

    rerender({ runtimeHook: hookB });

    expect(result.current).toBe(runtimeB);
  });
});
