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
    const sizesAfterUnregister: number[] = [];
    const register = (host: AssistantFrameHost) => {
      registered.add(host);
      return () => {
        registered.delete(host);
        sizesAfterUnregister.push(registered.size);
      };
    };
    renderHook(() =>
      useAssistantFrameHost({
        iframeRef: { current: iframe },
        targetOrigin: "https://frame.example",
        register,
      }),
    );
    const postContext = (tools: Record<string, { parameters: object }>) =>
      window.dispatchEvent(
        new MessageEvent("message", {
          source: contentWindow,
          origin: "https://frame.example",
          data: {
            channel: "assistant-ui-frame",
            message: { type: "model-context-update", context: { tools } },
          },
        }),
      );
    postContext({ search: { parameters: {} } });
    const [host] = registered;
    const call = host!.getModelContext().tools!.search!.execute!({}, {
      abortSignal: new AbortController().signal,
    } as never) as Promise<unknown>;

    iframe.dispatchEvent(new Event("load"));

    expect(
      [...registered].map((current) => current.getModelContext().tools),
    ).toEqual([undefined]);
    expect(sizesAfterUnregister).toEqual([1]);
    await expect(call).rejects.toThrow("AssistantFrameHost has been disposed");

    postContext({ lookup: { parameters: {} } });

    expect(
      [...registered].map((current) =>
        Object.keys(current.getModelContext().tools ?? {}),
      ),
    ).toEqual([["lookup"]]);
  });

  it("logs a cleanup failure during a frame navigation instead of throwing it from the load listener", () => {
    const disposalError = new Error("tool cancellation failed");
    vi.spyOn(AssistantFrameHost.prototype, "dispose").mockImplementationOnce(
      () => {
        throw disposalError;
      },
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const uncaught: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      event.preventDefault();
      uncaught.push(event.error);
    };
    window.addEventListener("error", onError);
    const iframe = document.createElement("iframe");
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: vi.fn() } as unknown as Window,
    });
    const registered = new Set<AssistantFrameHost>();
    const register = (host: AssistantFrameHost) => {
      registered.add(host);
      return () => registered.delete(host);
    };
    renderHook(() =>
      useAssistantFrameHost({ iframeRef: { current: iframe }, register }),
    );
    const [initial] = registered;

    iframe.dispatchEvent(new Event("load"));
    window.removeEventListener("error", onError);

    expect(uncaught).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] AssistantFrameHost cleanup after a frame navigation failed.",
      disposalError,
    );
    expect(registered.size).toBe(1);
    expect(registered.has(initial!)).toBe(false);
  });
});
