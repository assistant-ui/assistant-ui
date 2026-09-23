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
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as HTMLIFrameElement,
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

  it("drops the old document's tools and rejects its calls when the frame navigates", async () => {
    const iframe = document.createElement("iframe");
    const contentWindow = { postMessage: vi.fn() } as unknown as Window;
    Object.defineProperty(iframe, "contentWindow", { value: contentWindow });
    const registered = new Set<AssistantFrameHost>();
    const register = (host: AssistantFrameHost) => {
      registered.add(host);
      return () => registered.delete(host);
    };
    renderHook(() =>
      useAssistantFrameHost({
        iframeRef: { current: iframe },
        targetOrigin: "https://frame.example",
        register,
      }),
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        source: contentWindow,
        origin: "https://frame.example",
        data: {
          channel: "assistant-ui-frame",
          message: {
            type: "model-context-update",
            context: { tools: { search: { parameters: {} } } },
          },
        },
      }),
    );
    const [host] = registered;
    const call = host!.getModelContext().tools!.search!.execute!({}, {
      abortSignal: new AbortController().signal,
    } as never) as Promise<unknown>;

    iframe.dispatchEvent(new Event("load"));

    expect(
      [...registered].map((current) => current.getModelContext().tools),
    ).toEqual([undefined]);
    await expect(call).rejects.toThrow("AssistantFrameHost has been disposed");
  });
});
