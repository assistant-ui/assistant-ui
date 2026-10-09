// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { extrasRef } = vi.hoisted(() => ({
  extrasRef: { current: undefined as unknown },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: ((selector: (state: unknown) => unknown) =>
    selector({
      thread: { extras: extrasRef.current },
    })) as typeof import("@assistant-ui/store").useAuiState,
}));

import { flueExtras, type FlueRuntimeExtras } from "./flueExtras";
import { useFlueRuntimeExtras } from "./hooks";

afterEach(() => {
  extrasRef.current = undefined;
});

describe("useFlueRuntimeExtras", () => {
  it("reads the complete Flue state from runtime extras", () => {
    const refresh = vi.fn();
    const extras: FlueRuntimeExtras = {
      error: undefined,
      failedSends: [],
      historyReady: true,
      messages: [],
      refresh,
      settlements: [],
      status: "idle",
    };
    extrasRef.current = flueExtras.provide(extras);

    expect(renderHook(() => useFlueRuntimeExtras()).result.current).toBe(
      extras,
    );
  });

  it("throws when no Flue runtime is active", () => {
    expect(() => renderHook(() => useFlueRuntimeExtras())).toThrow(
      "useFlueRuntime",
    );
  });
});
