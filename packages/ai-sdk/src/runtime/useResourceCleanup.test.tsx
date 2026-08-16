// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { StrictMode, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { useResourceCleanup } from "./useResourceCleanup";

describe("useResourceCleanup", () => {
  it("does not treat React effect cleanup as client destruction", () => {
    const cleanup = vi.fn();
    const wrapper = ({ children }: PropsWithChildren) => (
      <StrictMode>{children}</StrictMode>
    );

    const hook = renderHook(() => useResourceCleanup(true, cleanup), {
      wrapper,
    });

    hook.unmount();

    expect(cleanup).not.toHaveBeenCalled();
  });
});
