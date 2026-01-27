import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  PreContext,
  useIsStreamdownCodeBlock,
  useStreamdownPreProps,
} from "../adapters/PreOverride";

describe("useIsStreamdownCodeBlock", () => {
  it("returns false when not inside PreContext", () => {
    const { result } = renderHook(() => useIsStreamdownCodeBlock());
    expect(result.current).toBe(false);
  });

  it("returns true when inside PreContext", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PreContext.Provider value={{ className: "test" }}>
        {children}
      </PreContext.Provider>
    );

    const { result } = renderHook(() => useIsStreamdownCodeBlock(), {
      wrapper,
    });
    expect(result.current).toBe(true);
  });
});

describe("useStreamdownPreProps", () => {
  it("returns null when not inside PreContext", () => {
    const { result } = renderHook(() => useStreamdownPreProps());
    expect(result.current).toBeNull();
  });

  it("returns context value when inside PreContext", () => {
    const preProps = { className: "test-class", "data-foo": "bar" };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PreContext.Provider value={preProps}>{children}</PreContext.Provider>
    );

    const { result } = renderHook(() => useStreamdownPreProps(), { wrapper });
    expect(result.current).toEqual(preProps);
  });
});
