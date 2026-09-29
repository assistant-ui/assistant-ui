import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stateDelta: {} as Record<string, unknown>,
}));

vi.mock("./adkExtras", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./adkExtras")>()),
  adkExtras: {
    use: (
      selector: (extras: { stateDelta: Record<string, unknown> }) => unknown,
    ) => selector({ stateDelta: mocks.stateDelta }),
  },
}));

import { useAdkAppState } from "./hooks";

describe("ADK state hooks", () => {
  it("preserves a prototype-named state key", () => {
    mocks.stateDelta = Object.fromEntries([
      ["app:__proto__", { source: "provider" }],
      ["app:visible", true],
    ]);

    const { result } = renderHook(() => useAdkAppState());

    expect(Object.getPrototypeOf(result.current)).toBe(Object.prototype);
    expect(Object.hasOwn(result.current, "__proto__")).toBe(true);
    expect(result.current["__proto__"]).toEqual({ source: "provider" });
    expect(result.current.visible).toBe(true);
  });
});
