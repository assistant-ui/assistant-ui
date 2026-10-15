// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { ModelContextRegistry } from "@assistant-ui/core";
import { expect, it, vi } from "vitest";
import { useAssistantFrameHost } from "./useAssistantFrameHost";

vi.mock("@assistant-ui/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core")>()),
  AssistantFrameHost: (
    await import("../../../../core/src/model-context/frame/host")
  ).AssistantFrameHost,
}));

it("drops tools and pending calls when a frame loads a page without a provider", async () => {
  vi.useFakeTimers();
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(() => {});
  const registry = new ModelContextRegistry();
  const register = (host: Parameters<typeof registry.addProvider>[0]) =>
    registry.addProvider(host).remove;
  const { unmount } = renderHook(() =>
    useAssistantFrameHost({ iframeRef: { current: iframe }, register }),
  );

  try {
    iframe.dispatchEvent(new Event("load"));
    window.dispatchEvent(
      new MessageEvent("message", {
        source: iframe.contentWindow,
        origin: window.location.origin,
        data: {
          channel: "assistant-ui-frame",
          message: {
            type: "model-context-update",
            context: { tools: { search: { parameters: { type: "object" } } } },
          },
        },
      }),
    );
    const search = registry.getModelContext().tools?.search;
    expect(search).toBeDefined();
    const outcome = Promise.resolve(search!.execute!({}, {} as any)).catch(
      (error: unknown) => error,
    );

    iframe.dispatchEvent(new Event("load"));
    expect(registry.getModelContext().tools?.search).toBeDefined();
    vi.advanceTimersByTime(2000);
    expect(registry.getModelContext().tools?.search).toBeUndefined();
    expect(await outcome).toBeInstanceOf(Error);
  } finally {
    unmount();
    iframe.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  }
});

it("clears a reloaded frame when the hook mounted after its initial load", () => {
  vi.useFakeTimers();
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  const postMessage = vi
    .spyOn(iframe.contentWindow!, "postMessage")
    .mockImplementation(() => {});
  const registry = new ModelContextRegistry();
  const register = (host: Parameters<typeof registry.addProvider>[0]) =>
    registry.addProvider(host).remove;
  const { unmount } = renderHook(() =>
    useAssistantFrameHost({ iframeRef: { current: iframe }, register }),
  );

  try {
    window.dispatchEvent(
      new MessageEvent("message", {
        source: iframe.contentWindow,
        origin: window.location.origin,
        data: {
          channel: "assistant-ui-frame",
          message: {
            type: "model-context-update",
            documentId: "first",
            context: { tools: { search: { parameters: { type: "object" } } } },
          },
        },
      }),
    );
    expect(registry.getModelContext().tools?.search).toBeDefined();
    postMessage.mockClear();

    iframe.dispatchEvent(new Event("load"));
    expect(registry.getModelContext().tools?.search).toBeDefined();
    vi.advanceTimersByTime(2000);
    expect(registry.getModelContext().tools?.search).toBeUndefined();
    expect(postMessage).toHaveBeenCalledWith(
      {
        channel: "assistant-ui-frame",
        message: { type: "model-context-request" },
      },
      window.location.origin,
    );
  } finally {
    unmount();
    iframe.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  }
});
