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
    const messageListeners = new Set<(event: MessageEvent) => void>();
    const addEventListener = window.addEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation(
      (type, listener, options) => {
        if (type === "message") {
          messageListeners.add(listener as (event: MessageEvent) => void);
          return;
        }
        addEventListener(type, listener, options);
      },
    );
    vi.spyOn(window, "removeEventListener").mockImplementation(
      (type, listener) => {
        if (type === "message") {
          messageListeners.delete(listener as (event: MessageEvent) => void);
        }
      },
    );
    const contentWindow = { postMessage: vi.fn() } as unknown as Window;
    const loadListeners = new Set<() => void>();
    const iframeRef = {
      current: {
        contentWindow,
        addEventListener: (_type: string, listener: () => void) =>
          loadListeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) =>
          loadListeners.delete(listener),
      } as unknown as HTMLIFrameElement,
    };
    const registered = new Set<AssistantFrameHost>();
    const register = (host: AssistantFrameHost) => {
      registered.add(host);
      return () => registered.delete(host);
    };
    renderHook(() =>
      useAssistantFrameHost({
        iframeRef,
        targetOrigin: "https://frame.example",
        register,
      }),
    );
    for (const listener of messageListeners) {
      listener({
        source: contentWindow,
        origin: "https://frame.example",
        data: {
          channel: "assistant-ui-frame",
          message: {
            type: "model-context-update",
            context: { tools: { search: { parameters: {} } } },
          },
        },
      } as MessageEvent);
    }
    const [host] = registered;
    const call = host!.getModelContext().tools!.search!.execute!({}, {
      abortSignal: new AbortController().signal,
    } as never) as Promise<unknown>;

    for (const listener of loadListeners) listener();

    expect(
      [...registered].map((current) => current.getModelContext().tools),
    ).toEqual([undefined]);
    await expect(call).rejects.toThrow("AssistantFrameHost has been disposed");
  });
});
