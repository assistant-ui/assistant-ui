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
    const disposalError = new Error("tool cancellation failed");
    const unregistrationError = new Error("unregistration failed");
    vi.spyOn(AssistantFrameHost.prototype, "dispose").mockImplementation(() => {
      throw disposalError;
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const unsubscribe = vi.fn(() => {
      throw unregistrationError;
    });
    const register = vi.fn(() => unsubscribe);
    const iframeRef = {
      current: {
        contentWindow: { postMessage: vi.fn() } as unknown as Window,
      } as HTMLIFrameElement,
    };
    const { unmount } = renderHook(() =>
      useAssistantFrameHost({ iframeRef, register }),
    );

    expect(() => unmount()).toThrow(disposalError);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] AssistantFrameHost unregistration failed.",
      unregistrationError,
    );
  });
});
