// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { AssistantFrameHost } from "@assistant-ui/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAssistantFrameHost } from "./useAssistantFrameHost";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAssistantFrameHost", () => {
  it("unregisters the host when disposal throws", () => {
    const error = new Error("tool cancellation failed");
    vi.spyOn(AssistantFrameHost.prototype, "dispose").mockImplementation(() => {
      throw error;
    });
    const unsubscribe = vi.fn();
    const register = vi.fn(() => unsubscribe);
    const iframeRef = {
      current: {
        contentWindow: { postMessage: vi.fn() } as unknown as Window,
      } as HTMLIFrameElement,
    };
    const { unmount } = renderHook(() =>
      useAssistantFrameHost({ iframeRef, register }),
    );

    expect(() => unmount()).toThrow(error);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
